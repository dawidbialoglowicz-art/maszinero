import "server-only";
import { db } from "./db";
import { currentUser } from "./session";

export async function favoriteIds(): Promise<Set<string>> {
  const user = await currentUser();
  if (!user) return new Set();
  const rows = await db.favorite.findMany({ where: { userId: user.id }, select: { listingId: true } });
  return new Set(rows.map((r) => r.listingId));
}
