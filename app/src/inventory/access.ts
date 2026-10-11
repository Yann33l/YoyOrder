import type { User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import type { Prisma } from "@prisma/client";
import { workspaceDb } from "./workspace";

export type EffectiveUser = User & { roleSectorIds?: number[]; rolePieceIds?: number[] };
export function isAccountValid(user: { isAuthorized: boolean; validUntil?: Date | null }, now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  return user.isAuthorized && (!user.validUntil || new Date(user.validUntil).toISOString().slice(0, 10) >= today);
}
export async function resolveAccess(user: User): Promise<EffectiveUser> {
  if (!user.roleIds?.length) return { ...user, isAuthorized: isAccountValid(user) };
  const roles = await workspaceDb(user).accessRole.findMany({ where: { id: { in: user.roleIds } } });
  return {
    ...user, isAuthorized: isAccountValid(user),
    isRequester: roles.some((role) => role.isRequester), isBuyer: roles.some((role) => role.isBuyer), isEditor: roles.some((role) => role.isEditor),
    roleSectorIds: [...new Set(roles.flatMap((role) => role.sectorIds))], rolePieceIds: [...new Set(roles.flatMap((role) => role.pieceIds))],
  };
}
export async function requireActiveUser(context: { user?: User | null }) {
  if (!context.user) throw new HttpError(401, "Authentification requise");
  const resolved = await resolveAccess(context.user);
  const user = { ...resolved, isAdmin: resolved.isAdmin || resolved.isSuperAdmin };
  if (!user.isAuthorized) throw new HttpError(403, "Compte inactif ou arrivé en fin de validité");
  if (!user.workspaceId) throw new HttpError(403, "Aucun espace de travail attribué");
  const workspace = await prisma.workspace.findUnique({ where: { id: user.workspaceId }, include: { plan: true } });
  if (!workspace?.enabled) throw new HttpError(403, "Cet espace de travail est suspendu");
  if (!workspaceEntitled(workspace) && !user.isSuperAdmin) throw new HttpError(403, "Abonnement à régulariser depuis la page Tarifs");
  return user;
}
export function workspaceEntitled(workspace: { plan?: { monthlyPriceCents: number } | null; subscriptionStatus?: string | null }) {
  return !workspace.plan?.monthlyPriceCents || ["manual", "active", "trialing"].includes(workspace.subscriptionStatus ?? "");
}
export async function accessSectorIds(user: EffectiveUser) {
  if (user.roleSectorIds !== undefined) return user.roleSectorIds;
  if (user.isAdmin) return null;
  const memberships = await workspaceDb(user).userSector.findMany({ where: { userId: user.id }, select: { sectorId: true } });
  return memberships.map(({ sectorId }) => sectorId);
}
export function pieceScope(user: EffectiveUser): Prisma.ArticleWhereInput {
  return user.rolePieceIds === undefined ? {} : { pieces: { some: { pieceId: { in: user.rolePieceIds } } } };
}
export function orderScope(user: EffectiveUser, sectorIds: number[] | null): Prisma.OrderWhereInput | undefined {
  if (sectorIds === null) return undefined;
  return { sectors: { some: { sectorId: { in: sectorIds ?? [] } } }, ...(user.rolePieceIds === undefined ? {} : { article: pieceScope(user) }) };
}
export async function assertArticleVisible(user: EffectiveUser, articleId: number) {
  if (user.rolePieceIds === undefined) return;
  const sectors = await accessSectorIds(user);
  const article = await workspaceDb(user).article.findFirst({ where: { id: articleId, sectors: { some: { sectorId: { in: sectors ?? [] } } }, ...pieceScope(user) }, select: { id: true } });
  if (!article) throw new HttpError(403, "Cet article n’est pas visible pour vos rôles");
}
export function assertPieceSelection(user: EffectiveUser, pieceIds: number[]) {
  if (!user.isAdmin && user.rolePieceIds !== undefined && (!pieceIds.length || pieceIds.some((id) => !user.rolePieceIds!.includes(id)))) throw new HttpError(403, "Sélectionnez uniquement des pièces autorisées par vos rôles");
}
