import "server-only";
import { db } from "../db";
import { CATEGORIES } from "../catalog";

/**
 * Wykonuje decyzję administratora. Zatwierdzenie robi to, co proponował agent;
 * odrzucenie wstrzymanego ogłoszenia przywraca je do sprzedaży.
 */
export async function decideAction(id: string, approve: boolean, adminId: string): Promise<{ error?: string; listingId?: string | null }> {
  return db.$transaction(async (tx) => {
    const a = await tx.agentAction.findUnique({ where: { id } });
    if (!a) return { error: "Nie znaleziono decyzji" };
    if (a.status !== "PENDING") return { error: "Ta decyzja została już podjęta" };

    if (approve) {
      switch (a.kind) {
        case "FLAG_LISTING":
          if (a.listingId) await tx.listing.updateMany({ where: { id: a.listingId, status: "ACTIVE" }, data: { status: "HIDDEN" } });
          break;
        case "CHANGE_CATEGORY": {
          const category = (a.payload as { category?: string } | null)?.category;
          if (!category || !CATEGORIES.some((c) => c.id === category)) return { error: "Nieprawidłowa kategoria" };
          if (a.listingId) await tx.listing.update({ where: { id: a.listingId }, data: { category } });
          break;
        }
        case "VERIFY_COMPANY":
          if (a.userId) await tx.user.update({ where: { id: a.userId }, data: { verified: true } });
          break;
        // HIDE_LISTING: ogłoszenie jest już wstrzymane; FLAG_COMPANY: tylko informacja
      }
    } else if (a.kind === "HIDE_LISTING" && a.listingId) {
      await tx.listing.updateMany({ where: { id: a.listingId, status: "HIDDEN" }, data: { status: "ACTIVE" } });
    }

    await tx.agentAction.update({
      where: { id },
      data: { status: approve ? "APPROVED" : "REJECTED", decidedById: adminId, decidedAt: new Date() },
    });
    return { listingId: a.listingId };
  });
}
