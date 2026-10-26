"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "./db";
import { currentUser } from "./session";
import { decideAction } from "./agent/decisions";

const idSchema = z.string().min(1).max(40);

async function admin() {
  const user = await currentUser();
  return user?.role === "ADMIN" ? user : null;
}

export async function decideAgentAction(id: string, approve: boolean): Promise<{ error?: string }> {
  const user = await admin();
  if (!user) return { error: "Brak uprawnień" };
  if (!idSchema.safeParse(id).success) return { error: "Nieprawidłowe dane" };
  const r = await decideAction(id, approve === true, user.id);
  if (r.error) return { error: r.error };
  revalidatePath("/admin");
  revalidatePath("/");
  if (r.listingId) revalidatePath(`/ogloszenia/${r.listingId}`);
  return {};
}

export async function setUserVerified(userId: string, verified: boolean): Promise<{ error?: string }> {
  const user = await admin();
  if (!user) return { error: "Brak uprawnień" };
  if (!idSchema.safeParse(userId).success) return { error: "Nieprawidłowe dane" };
  await db.user.update({ where: { id: userId }, data: { verified: verified === true } });
  revalidatePath("/admin");
  return {};
}

export async function setListingHidden(listingId: string, hidden: boolean): Promise<{ error?: string }> {
  const user = await admin();
  if (!user) return { error: "Brak uprawnień" };
  if (!idSchema.safeParse(listingId).success) return { error: "Nieprawidłowe dane" };
  await db.listing.updateMany({
    where: { id: listingId, status: hidden ? "ACTIVE" : "HIDDEN" },
    data: { status: hidden ? "HIDDEN" : "ACTIVE" },
  });
  revalidatePath("/admin");
  revalidatePath(`/ogloszenia/${listingId}`);
  return {};
}
