import type { User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import type { Prisma } from "@prisma/client";

export type EffectiveUser = User & { roleSectorIds?: number[]; rolePieceIds?: number[] };
export function isAccountValid(user: { isAuthorized: boolean; validUntil?: Date | null }, now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  return user.isAuthorized && (!user.validUntil || new Date(user.validUntil).toISOString().slice(0, 10) >= today);
}
export async function resolveAccess(user: User): Promise<EffectiveUser> {
  if (!user.roleIds?.length) return { ...user, isAuthorized: isAccountValid(user) };
  const roles = await prisma.accessRole.findMany({ where: { id: { in: user.roleIds } } });
  return {
    ...user, isAuthorized: isAccountValid(user),
    isRequester: roles.some((role) => role.isRequester), isBuyer: roles.some((role) => role.isBuyer), isEditor: roles.some((role) => role.isEditor),
    roleSectorIds: [...new Set(roles.flatMap((role) => role.sectorIds))], rolePieceIds: [...new Set(roles.flatMap((role) => role.pieceIds))],
  };
}
export async function requireActiveUser(context: { user?: User | null }) {
  if (!context.user) throw new HttpError(401, "Authentification requise");
  const user = await resolveAccess(context.user);
  if (!user.isAuthorized) throw new HttpError(403, "Compte inactif ou arrivé en fin de validité");
  return user;
}
export async function accessSectorIds(user: EffectiveUser) {
  if (user.isAdmin) return null;
  if (user.roleSectorIds !== undefined) return user.roleSectorIds;
  const memberships = await prisma.userSector.findMany({ where: { userId: user.id }, select: { sectorId: true } });
  return memberships.map(({ sectorId }) => sectorId);
}
export function pieceScope(user: EffectiveUser): Prisma.ArticleWhereInput {
  return user.isAdmin || user.rolePieceIds === undefined ? {} : { pieces: { some: { pieceId: { in: user.rolePieceIds } } } };
}
export function orderScope(user: EffectiveUser, sectorIds: number[] | null): Prisma.OrderWhereInput | undefined {
  if (user.isAdmin) return undefined;
  return { sectors: { some: { sectorId: { in: sectorIds ?? [] } } }, ...(user.rolePieceIds === undefined ? {} : { article: pieceScope(user) }) };
}
export async function assertArticleVisible(user: EffectiveUser, articleId: number) {
  if (user.isAdmin || user.rolePieceIds === undefined) return;
  const sectors = await accessSectorIds(user);
  const article = await prisma.article.findFirst({ where: { id: articleId, sectors: { some: { sectorId: { in: sectors ?? [] } } }, ...pieceScope(user) }, select: { id: true } });
  if (!article) throw new HttpError(403, "Cet article n’est pas visible pour vos rôles");
}
export function assertPieceSelection(user: EffectiveUser, pieceIds: number[]) {
  if (!user.isAdmin && user.rolePieceIds !== undefined && (!pieceIds.length || pieceIds.some((id) => !user.rolePieceIds!.includes(id)))) throw new HttpError(403, "Sélectionnez uniquement des pièces autorisées par vos rôles");
}
