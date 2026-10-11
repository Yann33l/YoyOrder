import type { SaasPlan, Workspace, User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import { createUser, createProviderId, sanitizeAndSerializeProviderData, createEmailVerificationLink } from "wasp/server/auth";
import type { GetPublicPlans, GetSaasAdministration, SaveSaasPlan, CreateCompanyWorkspace, UpdateCompanyWorkspace, SwitchCompanyWorkspace, CreateOwnWorkspace, StartWorkspaceCheckout, GetWorkspaceBilling, OpenWorkspacePortal } from "wasp/server/operations";
import { z } from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { isAccountValid } from "../inventory/access";
import { stripeClient } from "../payment/stripe/stripeClient";

export async function requireSuperAdmin(context: { user?: User | null }) {
  if (!context.user) throw new HttpError(401, "Authentification requise");
  if (!context.user.isSuperAdmin || !isAccountValid(context.user)) throw new HttpError(403, "Réservé au super administrateur SaaS");
  return context.user;
}
export const getPublicPlans: GetPublicPlans<Record<string, never>, Omit<SaasPlan, "stripePriceId">[]> = async () => {
  const plans = await prisma.saasPlan.findMany({ where: { published: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  return plans.map(({ stripePriceId: _stripePriceId, ...plan }) => plan);
};
type WorkspaceSummary = Workspace & { usersCount: number; storageBytes: number };
export const getSaasAdministration: GetSaasAdministration<Record<string, never>, { plans: SaasPlan[]; workspaces: WorkspaceSummary[] }> = async (_args, context) => {
  await requireSuperAdmin(context);
  const [plans, spaces, stocks] = await Promise.all([
    prisma.saasPlan.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.workspace.findMany({ include: { _count: { select: { users: { where: { isSuperAdmin: false, isAuthorized: true, OR: [{ validUntil: null }, { validUntil: { gte: new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })}T00:00:00Z`) } }] } } } } }, orderBy: { name: "asc" } }),
    prisma.stock.groupBy({ by: ["workspaceId"], _sum: { coaBytes: true } }),
  ]);
  return { plans, workspaces: spaces.map(({ _count, ...workspace }) => ({ ...workspace, usersCount: _count.users, storageBytes: stocks.find((stock) => stock.workspaceId === workspace.id)?._sum.coaBytes ?? 0 })) };
};
const planSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(120), description: z.string().trim().max(2000), monthlyPriceCents: z.number().int().min(0), stripePriceId: z.string().trim().regex(/^price_[a-zA-Z0-9]+$/).nullable(), maxUsers: z.number().int().positive().nullable(), storageMb: z.number().int().min(1).max(1000000), displayOrder: z.number().int().min(0), published: z.boolean(), featured: z.boolean(), features: z.array(z.string().trim().min(1).max(255)).max(30) });
export const saveSaasPlan: SaveSaasPlan<z.infer<typeof planSchema>, { id: string }> = async (args, context) => {
  await requireSuperAdmin(context);
  const { id, ...data } = ensureArgsSchemaOrThrowHttpError(planSchema, args);
  if (data.monthlyPriceCents > 0 && !data.stripePriceId) throw new HttpError(400, "Un plan payant doit avoir un tarif Stripe");
  if (!data.monthlyPriceCents && data.stripePriceId) throw new HttpError(400, "L’offre gratuite ne doit pas avoir de tarif Stripe");
  if (id) {
    const existing = await prisma.saasPlan.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Plan introuvable");
    if (existing.stripePriceId && (existing.stripePriceId !== data.stripePriceId || existing.monthlyPriceCents !== data.monthlyPriceCents)) throw new HttpError(400, "Le tarif d’un plan payant est immuable : créez un nouveau plan pour le changer");
  }
  return id ? prisma.saasPlan.update({ where: { id }, data }) : prisma.saasPlan.create({ data });
};
const spaceSchema = z.object({ name: z.string().trim().min(1).max(160), planId: z.string().nullable(), adminEmail: z.email().trim().toLowerCase(), adminPassword: z.string().min(12).max(128) });
export const createCompanyWorkspace: CreateCompanyWorkspace<z.infer<typeof spaceSchema>, { id: string; verificationLink: string }> = async (args, context) => {
  await requireSuperAdmin(context);
  const input = ensureArgsSchemaOrThrowHttpError(spaceSchema, args);
  if (input.planId && !await prisma.saasPlan.findUnique({ where: { id: input.planId } })) throw new HttpError(400, "Plan introuvable");
  if (await prisma.user.findFirst({ where: { email: { equals: input.adminEmail, mode: "insensitive" } } })) throw new HttpError(409, "Cet email possède déjà un compte");
  const provider = await sanitizeAndSerializeProviderData<"email">({ hashedPassword: input.adminPassword, isEmailVerified: false, emailVerificationSentAt: null, passwordResetSentAt: null });
  const space = await prisma.workspace.create({ data: { name: input.name, planId: input.planId, subscriptionStatus: "manual" } });
  try {
    await createUser(createProviderId("email", input.adminEmail), provider, { email: input.adminEmail, username: input.adminEmail, workspace: { connect: { id: space.id } }, isAuthorized: true, isAdmin: true, isRequester: true, isBuyer: true, isEditor: true });
  } catch (error) { await prisma.workspace.update({ where: { id: space.id }, data: { enabled: false } }); throw error; }
  return { id: space.id, verificationLink: await createEmailVerificationLink(input.adminEmail, "/email-verification") };
};
const updateSpaceSchema = z.object({ id: z.string(), name: z.string().trim().min(1).max(160), enabled: z.boolean(), planId: z.string().nullable() });
export const updateCompanyWorkspace: UpdateCompanyWorkspace<z.infer<typeof updateSpaceSchema>, { id: string }> = async (args, context) => {
  const actor = await requireSuperAdmin(context);
  const { id, ...data } = ensureArgsSchemaOrThrowHttpError(updateSpaceSchema, args);
  if (actor.workspaceId === id && !data.enabled) throw new HttpError(400, "Sélectionnez un autre espace avant de suspendre celui-ci");
  if (data.planId && !await prisma.saasPlan.findUnique({ where: { id: data.planId } })) throw new HttpError(400, "Plan introuvable");
  const existing = await prisma.workspace.findUnique({ where: { id } });
  if (existing?.stripeSubscriptionId && existing.planId !== data.planId) throw new HttpError(400, "Modifiez cet abonnement depuis Stripe pour conserver la facturation synchronisée");
  return prisma.workspace.update({ where: { id }, data: { ...data, ...(!existing?.stripeSubscriptionId && existing?.planId !== data.planId ? { subscriptionStatus: "manual" } : {}) } });
};
export const switchCompanyWorkspace: SwitchCompanyWorkspace<{ workspaceId: string }, { id: string }> = async (args, context) => {
  const actor = await requireSuperAdmin(context);
  const { workspaceId } = ensureArgsSchemaOrThrowHttpError(z.object({ workspaceId: z.string() }), args);
  const space = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!space?.enabled) throw new HttpError(400, "Espace introuvable ou suspendu");
  return prisma.user.update({ where: { id: actor.id }, data: { workspaceId, roleIds: [] }, select: { id: true } });
};
export const createOwnWorkspace: CreateOwnWorkspace<{ name: string; planId: string }, { id: string }> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Authentification requise");
  const input = ensureArgsSchemaOrThrowHttpError(z.object({ name: z.string().trim().min(1).max(160), planId: z.string() }), args);
  const plan = await prisma.saasPlan.findFirst({ where: { id: input.planId, published: true } });
  if (!plan) throw new HttpError(404, "Offre indisponible");
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: context.user!.id } });
    if (current?.workspaceId) throw new HttpError(409, "Votre compte possède déjà un espace");
    const space = await tx.workspace.create({ data: { name: input.name, planId: plan.id, subscriptionStatus: plan.monthlyPriceCents ? "incomplete" : "free" } });
    const updated = await tx.user.updateMany({ where: { id: context.user!.id, workspaceId: null }, data: { workspaceId: space.id, isAuthorized: true, isAdmin: true, isRequester: true, isBuyer: true, isEditor: true } });
    if (updated.count !== 1) throw new HttpError(409, "Votre espace vient d’être créé. Rechargez la page.");
    return { id: space.id };
  });
};
export const startWorkspaceCheckout: StartWorkspaceCheckout<{ planId: string }, { url: string }> = async (args, context) => {
  const user = context.user;
  if (!user || !isAccountValid(user) || !user.workspaceId || (!user.isAdmin && !user.isSuperAdmin)) throw new HttpError(403, "Seul l’administrateur de l’entreprise peut gérer son abonnement");
  const { planId } = ensureArgsSchemaOrThrowHttpError(z.object({ planId: z.string() }), args);
  const plan = await prisma.saasPlan.findFirst({ where: { id: planId, published: true } });
  const space = await prisma.workspace.findUnique({ where: { id: user.workspaceId } });
  if (!space?.enabled || !plan) throw new HttpError(404, "Espace ou offre indisponible");
  if (space.stripeSubscriptionId) throw new HttpError(409, "Un abonnement existe déjà : utilisez le portail de facturation pour le modifier");
  if (!plan.monthlyPriceCents) {
    await prisma.workspace.update({ where: { id: space.id }, data: { planId: plan.id, subscriptionStatus: "free", billingUpdatedAt: new Date() } });
    return { url: "/inventory" };
  }
  if (!plan.stripePriceId) throw new HttpError(400, "Ce plan ne possède pas de tarif Stripe");
  const price = await stripeClient.prices.retrieve(plan.stripePriceId);
  if (!price.active || price.currency !== "eur" || price.unit_amount !== plan.monthlyPriceCents || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) throw new HttpError(400, "Le tarif Stripe doit être actif, mensuel, en euros et correspondre au prix affiché");
  const customer = space.stripeCustomerId || (await stripeClient.customers.create({ email: user.email ?? undefined, name: space.name, metadata: { workspaceId: space.id } }, { idempotencyKey: `workspace-customer-${space.id}` })).id;
  await prisma.workspace.update({ where: { id: space.id }, data: { stripeCustomerId: customer } });
  const baseUrl = process.env.WASP_WEB_CLIENT_URL ?? "http://localhost:8083";
  const session = await stripeClient.checkout.sessions.create({ customer, mode: "subscription", line_items: [{ price: plan.stripePriceId, quantity: 1 }], success_url: `${baseUrl}/inventory`, cancel_url: `${baseUrl}/pricing`, metadata: { workspaceId: space.id, planId: plan.id }, subscription_data: { metadata: { workspaceId: space.id, planId: plan.id } } }, { idempotencyKey: `workspace-checkout-${space.id}-${plan.id}-${space.billingUpdatedAt?.getTime() ?? 0}-${Math.floor(Date.now() / 86400000)}` });
  if (!session.url) throw new HttpError(500, "Lien de paiement indisponible");
  return { url: session.url };
};
export const getWorkspaceBilling: GetWorkspaceBilling<Record<string, never>, { name: string; plan: SaasPlan | null; status: string | null; hasSubscription: boolean; storageBytes: number } | null> = async (_args, context) => {
  const user = context.user;
  if (!user || !isAccountValid(user) || (!user.isAdmin && !user.isSuperAdmin)) throw new HttpError(403, "Réservé à l’administrateur de l’entreprise");
  if (!user.workspaceId) return null;
  const space = await prisma.workspace.findUnique({ where: { id: user.workspaceId }, include: { plan: true } });
  if (!space) return null;
  const usage = await prisma.stock.aggregate({ where: { workspaceId: space.id }, _sum: { coaBytes: true } });
  return { name: space.name, plan: space.plan, status: space.subscriptionStatus, hasSubscription: Boolean(space.stripeSubscriptionId), storageBytes: usage._sum.coaBytes ?? 0 };
};
export const openWorkspacePortal: OpenWorkspacePortal<Record<string, never>, { url: string }> = async (_args, context) => {
  const user = context.user;
  if (!user || !isAccountValid(user) || (!user.isAdmin && !user.isSuperAdmin) || !user.workspaceId) throw new HttpError(403, "Réservé à l’administrateur de l’entreprise");
  const space = await prisma.workspace.findUnique({ where: { id: user.workspaceId } });
  if (!space?.stripeCustomerId) throw new HttpError(400, "Aucun compte de facturation Stripe associé");
  return stripeClient.billingPortal.sessions.create({ customer: space.stripeCustomerId, return_url: `${process.env.WASP_WEB_CLIENT_URL ?? "http://localhost:8083"}/pricing` });
};
