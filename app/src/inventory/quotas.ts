import { HttpError, prisma } from "wasp/server";
import type { Prisma } from "@prisma/client";
import type { User } from "wasp/entities";
export async function withUserQuota<T>(workspaceId: string, callback: () => Promise<T>, excludedUserId?: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { plan: true } });
  const limit = workspace?.plan?.maxUsers;
  if (limit === undefined || limit === null) return callback();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`;
    const today = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })}T00:00:00Z`);
    const count = await prisma.user.count({ where: { workspaceId, isSuperAdmin: false, isAuthorized: true, ...(excludedUserId ? { id: { not: excludedUserId } } : {}), OR: [{ validUntil: null }, { validUntil: { gte: today } }] } });
    if (count >= limit) throw new HttpError(403, `Le plan est limité à ${limit} utilisateur(s) actif(s)`);
    return callback();
  }, { timeout: 30000 });
}
export async function checkStorageQuota(tx: Prisma.TransactionClient, user: Pick<User, "workspaceId">, addedBytes: number) {
  if (!addedBytes || !user.workspaceId) return;
  const workspace = await prisma.workspace.findUnique({ where: { id: user.workspaceId }, include: { plan: true } });
  if (!workspace?.plan) return;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.workspaceId}))`;
  const storage = await tx.stock.aggregate({ where: { workspaceId: user.workspaceId }, _sum: { coaBytes: true } });
  if ((storage._sum.coaBytes ?? 0) + addedBytes > workspace.plan.storageMb * 1024 * 1024) throw new HttpError(403, "Le quota de stockage des certificats est atteint");
}
