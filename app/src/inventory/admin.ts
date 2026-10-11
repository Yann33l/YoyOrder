import type { User, AccessRole } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import { createUser, createProviderId, sanitizeAndSerializeProviderData, createEmailVerificationLink } from "wasp/server/auth";
import type { GetMyAccess, GetAccessAdministration, SaveAccessRole, SaveManagedUser, CreateManagedUser } from "wasp/server/operations";
import { z } from "zod";
import { requireActiveUser, resolveAccess, isAccountValid, workspaceEntitled } from "./access";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { workspaceDb } from "./workspace";
import { withUserQuota } from "./quotas";

async function requireAdmin(context: { user?: User | null }) {
  const user = await requireActiveUser(context);
  if (!user.isAdmin && !user.isSuperAdmin) throw new HttpError(403, "Réservé aux administrateurs");
  return user;
}
export const getMyAccess: GetMyAccess<Record<string, never>, Pick<User, "isAdmin" | "isSuperAdmin" | "workspaceId" | "isAuthorized" | "isRequester" | "isBuyer" | "isEditor" | "validUntil"> & { workspaceName: string | null }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Authentification requise");
  const user = await resolveAccess(context.user);
  const workspace = user.workspaceId ? await prisma.workspace.findUnique({ where: { id: user.workspaceId }, include: { plan: true } }) : null;
  return { isAdmin: user.isAdmin || user.isSuperAdmin, isSuperAdmin: user.isSuperAdmin, workspaceId: user.workspaceId, workspaceName: workspace?.name ?? null, isAuthorized: user.isAuthorized && Boolean(workspace?.enabled) && Boolean(workspace && (workspaceEntitled(workspace) || user.isSuperAdmin)), isRequester: user.isRequester, isBuyer: user.isBuyer, isEditor: user.isEditor, validUntil: user.validUntil };
};
type ManagedUser = Pick<User, "id" | "email" | "createdAt" | "isAdmin" | "isAuthorized" | "validUntil" | "roleIds" | "isRequester" | "isBuyer" | "isEditor">;
type Administration = { roles: AccessRole[]; users: ManagedUser[]; sectors: { id: number; label: string }[]; pieces: { id: number; label: string }[] };
export const getAccessAdministration: GetAccessAdministration<Record<string, never>, Administration> = async (_args, context) => {
  const actor = await requireAdmin(context);
  const prisma = workspaceDb(actor);
  const [roles, users, sectors, pieces] = await Promise.all([
    prisma.accessRole.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, email: true, createdAt: true, isAdmin: true, isAuthorized: true, validUntil: true, roleIds: true, isRequester: true, isBuyer: true, isEditor: true }, orderBy: { email: "asc" } }),
    prisma.sector.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.piece.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
  ]);
  return { roles, users, sectors, pieces };
};
const ids = z.array(z.number().int().positive());
const roleSchema = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(120), isRequester: z.boolean(), isBuyer: z.boolean(), isEditor: z.boolean(), sectorIds: ids, pieceIds: ids });
export const saveAccessRole: SaveAccessRole<z.infer<typeof roleSchema>, { id: number }> = async (args, context) => {
  const actor = await requireAdmin(context);
  const prisma = workspaceDb(actor);
  const { id, ...data } = ensureArgsSchemaOrThrowHttpError(roleSchema, args);
  if (!data.isRequester && !data.isBuyer && !data.isEditor) throw new HttpError(400, "Sélectionnez au moins une permission métier");
  data.sectorIds = [...new Set(data.sectorIds)]; data.pieceIds = [...new Set(data.pieceIds)];
  const [sectors, pieces, existing] = await Promise.all([
    prisma.sector.count({ where: { id: { in: data.sectorIds } } }), prisma.piece.count({ where: { id: { in: data.pieceIds } } }), prisma.accessRole.findFirst({ where: { name: { equals: data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) }, select: { id: true } }),
  ]);
  if (sectors !== data.sectorIds.length || pieces !== data.pieceIds.length) throw new HttpError(400, "Une pièce ou un secteur est introuvable");
  if (existing) throw new HttpError(409, "Un rôle porte déjà ce nom");
  return id ? prisma.accessRole.update({ where: { id }, data }) : prisma.accessRole.create({ data });
};
const accountSchema = z.object({ isAuthorized: z.boolean(), isAdmin: z.boolean().optional(), validUntil: z.string().date().nullable(), roleIds: ids });
function endOfDay(date: string | null) { return date ? new Date(`${date}T00:00:00.000Z`) : null; }
async function accountData(input: z.infer<typeof accountSchema>, prisma: ReturnType<typeof workspaceDb>) {
  const roleIds = [...new Set(input.roleIds)];
  const roles = await prisma.accessRole.findMany({ where: { id: { in: roleIds } } });
  if (roles.length !== roleIds.length) throw new HttpError(400, "Un rôle sélectionné est introuvable");
  if (input.isAuthorized && !roles.length && !input.isAdmin) throw new HttpError(400, "Attribuez au moins un rôle à un compte actif");
  return { roleIds, isAuthorized: input.isAuthorized, ...(input.isAdmin !== undefined ? { isAdmin: input.isAdmin } : {}), validUntil: endOfDay(input.validUntil), isRequester: false, isBuyer: false, isEditor: false };
}
const userSchema = accountSchema.extend({ userId: z.string().uuid() });
export const saveManagedUser: SaveManagedUser<z.infer<typeof userSchema>, { id: string }> = async (args, context) => {
  const actor = await requireAdmin(context);
  const prisma = workspaceDb(actor);
  const input = ensureArgsSchemaOrThrowHttpError(userSchema, args);
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (target?.isSuperAdmin && !actor.isSuperAdmin) throw new HttpError(403, "Seul le super administrateur peut modifier ce compte");
  const data = await accountData(input, prisma);
  if (actor.id === input.userId && !isAccountValid(data)) throw new HttpError(400, "Vous ne pouvez pas désactiver ou archiver votre propre compte administrateur");
  if (actor.id === input.userId && data.isAdmin === false && !actor.isSuperAdmin) throw new HttpError(400, "Vous ne pouvez pas retirer votre propre administration");
  const save = () => prisma.user.update({ where: { id: input.userId }, data, select: { id: true } });
  return isAccountValid(data) && !target?.isSuperAdmin ? withUserQuota(actor.workspaceId!, save, input.userId) : save();
};
const createSchema = accountSchema.extend({ email: z.email().trim().toLowerCase(), password: z.string().min(12).max(128) });
export const createManagedUser: CreateManagedUser<z.infer<typeof createSchema>, { id: string; verificationLink: string }> = async (args, context) => {
  const actor = await requireAdmin(context);
  const input = ensureArgsSchemaOrThrowHttpError(createSchema, args);
  const data = await accountData(input, workspaceDb(actor));
  if (await prisma.user.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } }, select: { id: true } })) throw new HttpError(409, "Ce compte existe déjà");
  const provider = await sanitizeAndSerializeProviderData<"email">({ hashedPassword: input.password, isEmailVerified: false, emailVerificationSentAt: null, passwordResetSentAt: null });
  const save = () => createUser(createProviderId("email", input.email), provider, { email: input.email, username: input.email, workspace: { connect: { id: actor.workspaceId! } }, ...data });
  const user = isAccountValid(data) ? await withUserQuota(actor.workspaceId!, save) : await save();
  return { id: user.id, verificationLink: await createEmailVerificationLink(input.email, "/email-verification") };
};
