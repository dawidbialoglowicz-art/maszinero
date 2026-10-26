import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "./session";

/** Panel administratora: nie-administratorom udajemy, że strona nie istnieje. */
export async function requireAdmin(next = "/admin") {
  const user = await requireUser(next);
  if (user.role !== "ADMIN") notFound();
  return user;
}
