import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ workspace: { findUnique: vi.fn(), updateMany: vi.fn() }, saasPlan: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, user: { count: vi.fn() }, stock: { aggregate: vi.fn() }, supportTicket: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }, $executeRaw: vi.fn(), $transaction: vi.fn() }));
vi.mock("wasp/server", () => ({ prisma: db, HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
vi.mock("wasp/server/auth", () => ({ createUser: vi.fn(), createProviderId: vi.fn(), sanitizeAndSerializeProviderData: vi.fn(), createEmailVerificationLink: vi.fn() }));
vi.mock("../payment/stripe/stripeClient", () => ({ stripeClient: { subscriptions: { retrieve: vi.fn() } } }));
import { scopedArgs, validateReferences } from "./workspace";
import { workspaceEntitled, requireActiveUser } from "./access";
import { withUserQuota, checkStorageQuota } from "./quotas";
import { getPublicPlans, requireSuperAdmin, saveSaasPlan } from "../saas/operations";
import { ticketScope, getTickets, replyTicket, updateTicket } from "../saas/tickets";
import { handleWorkspaceStripeEvent } from "../saas/stripe";
import { assertNewsAdmin } from "./news";
const user = { id: "u", workspaceId: "A", isAuthorized: true, isAdmin: true, isSuperAdmin: false, validUntil: null };
const root = { ...user, isSuperAdmin: true };
const plan = { name: "Entreprise", description: "", monthlyPriceCents: 1000, stripePriceId: "price_Test", maxUsers: 3, storageMb: 1, displayOrder: 0, published: true, featured: false, features: [] };
beforeEach(() => { vi.resetAllMocks(); db.$transaction.mockImplementation((fn) => fn(db)); });
describe("Isolation des entreprises", () => {
  it("limite l’assistance de l’espace utilisateur à l’entreprise sélectionnée même pour le super admin", async () => {
    db.supportTicket.findMany.mockResolvedValue([]);
    await getTickets({ workspaceOnly: true }, { user: root } as never);
    expect(db.supportTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { workspaceId: "A" } }));
  });
  it("réserve la publication des actualités à l’administrateur de l’entreprise", () => {
    expect(() => assertNewsAdmin(null)).toThrow();
    expect(() => assertNewsAdmin({ isAdmin: false })).toThrow();
    expect(() => assertNewsAdmin({ isAdmin: true })).not.toThrow();
  });
  it.each(["findMany", "findUnique", "count", "update", "updateMany", "deleteMany", "aggregate"])("impose l’entreprise sur %s même avec une recherche explicite adverse", (operation) => {
    expect(scopedArgs("Article", operation, { where: { id: 2, workspaceId: "B", OR: [{ label: "x" }] } }, "A")).toMatchObject({ where: { workspaceId: "B", AND: [{ workspaceId: "A" }] } });
  });
  it("attribue les créations au bon espace et protège les tables de liaison", () => {
    expect(scopedArgs("Article", "create", { data: { label: "x" } }, "A")).toEqual({ data: { label: "x", workspaceId: "A" } });
    expect(scopedArgs("ArticleSector", "findUnique", { where: { articleId_sectorId: { articleId: 1, sectorId: 2 } } }, "A")).toMatchObject({ where: { AND: [{ article: { workspaceId: "A" } }] } });
    expect(() => scopedArgs("Stock", "create", { data: { workspaceId: "B" } }, "A")).toThrow();
    expect(() => scopedArgs("User", "update", { where: { id: "u" }, data: { workspaceId: null } }, "A")).toThrow();
    expect(() => scopedArgs("User", "update", { where: { id: "u" }, data: { workspace: { connect: { id: "B" } } } }, "A")).toThrow();
    expect(() => scopedArgs("Article", "upsert", { where: { id: 1 }, create: { label: "x" }, update: { workspaceId: "B" } }, "A")).toThrow();
    expect(() => scopedArgs("Workspace", "findMany", {}, "A")).toThrow();
  });
  it("refuse les références d’une autre entreprise", async () => {
    const references = { supplier: { findUnique: vi.fn().mockResolvedValue(null) }, sector: { count: vi.fn().mockResolvedValue(0) }, piece: { count: vi.fn().mockResolvedValue(0) } };
    await expect(validateReferences(references as never, { supplierId: 42 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateReferences(references as never, { sectorIds: [42] })).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateReferences(references as never, { pieceIds: [42] })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("ne confond pas administrateur d’entreprise et super administrateur", async () => {
    await expect(requireSuperAdmin({ user } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(await requireSuperAdmin({ user: root } as never)).toEqual(root);
    await expect(requireSuperAdmin({ user: { ...root, isAuthorized: false } } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
});
describe("Plans et quotas", () => {
  it("refuse les espaces suspendus et les abonnements impayés côté serveur", async () => {
    db.workspace.findUnique.mockResolvedValue({ enabled: false });
    await expect(requireActiveUser({ user } as never)).rejects.toMatchObject({ statusCode: 403 });
    db.workspace.findUnique.mockResolvedValue({ enabled: true, plan, subscriptionStatus: "past_due" });
    await expect(requireActiveUser({ user } as never)).rejects.toMatchObject({ statusCode: 403 });
    await expect(requireActiveUser({ user: { ...user, workspaceId: null } } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("ne publie que les offres activées et masque les références Stripe", async () => {
    db.saasPlan.findMany.mockResolvedValue([{ id: "p", ...plan }]);
    const result = await getPublicPlans({} as never, {} as never);
    expect(db.saasPlan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { published: true } }));
    expect(result[0]).not.toHaveProperty("stripePriceId");
  });
  it("interdit la modification du prix payé d’un plan existant", async () => {
    db.saasPlan.findUnique.mockResolvedValue(plan);
    await expect(saveSaasPlan({ ...plan, id: "p", monthlyPriceCents: 2000 }, { user: root } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.saasPlan.update).not.toHaveBeenCalled();
  });
  it("bloque un utilisateur supplémentaire et exclut les comptes archivés du compteur", async () => {
    db.workspace.findUnique.mockResolvedValue({ plan: { maxUsers: 3 } }); db.user.count.mockResolvedValue(3);
    const create = vi.fn();
    await expect(withUserQuota("A", create, "u")).rejects.toMatchObject({ statusCode: 403 });
    expect(create).not.toHaveBeenCalled();
    expect(db.user.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workspaceId: "A", isAuthorized: true, isSuperAdmin: false, id: { not: "u" }, OR: expect.any(Array) }) }));
    expect(db.$executeRaw).toHaveBeenCalledOnce();
  });
  it("autorise l’utilisateur jusqu’à la limite et les offres sans limite", async () => {
    db.workspace.findUnique.mockResolvedValue({ plan: { maxUsers: 3 } }); db.user.count.mockResolvedValue(2);
    const create = vi.fn().mockResolvedValue("ok"); expect(await withUserQuota("A", create)).toBe("ok");
    db.workspace.findUnique.mockResolvedValue({ plan: { maxUsers: null } }); expect(await withUserQuota("A", create)).toBe("ok");
  });
  it("compte les octets des certificats conservés et refuse le dépassement", async () => {
    db.workspace.findUnique.mockResolvedValue({ plan: { storageMb: 1 } }); db.stock.aggregate.mockResolvedValue({ _sum: { coaBytes: 1024 * 1024 - 10 } });
    await expect(checkStorageQuota(db as never, user, 11)).rejects.toMatchObject({ statusCode: 403 });
    await expect(checkStorageQuota(db as never, user, 10)).resolves.toBeUndefined();
    expect(db.stock.aggregate).toHaveBeenCalledWith({ where: { workspaceId: "A" }, _sum: { coaBytes: true } });
  });
  it("n’autorise pas un espace payant avant la confirmation Stripe", () => {
    expect(workspaceEntitled({ plan, subscriptionStatus: "incomplete" })).toBe(false);
    expect(workspaceEntitled({ plan, subscriptionStatus: "past_due" })).toBe(false);
    expect(workspaceEntitled({ plan, subscriptionStatus: "active" })).toBe(true);
    expect(workspaceEntitled({ plan, subscriptionStatus: "manual" })).toBe(true);
    expect(workspaceEntitled({ plan: { monthlyPriceCents: 0 } })).toBe(true);
  });
});
describe("Tickets", () => {
  it("limite les tickets à l’entreprise et à l’auteur, avec une vue globale pour le support", async () => {
    expect(ticketScope(user as never)).toEqual({ workspaceId: "A" });
    expect(ticketScope({ ...user, isAdmin: false } as never)).toEqual({ workspaceId: "A", createdById: "u" });
    expect(ticketScope(root as never)).toEqual({});
    await getTickets({}, { user } as never);
    expect(db.supportTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { workspaceId: "A" } }));
  });
  it("refuse une réponse à un ticket étranger et réserve le triage au support", async () => {
    db.supportTicket.findFirst.mockResolvedValue(null);
    await expect(replyTicket({ ticketId: "B", body: "Bonjour" }, { user } as never)).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateTicket({ id: "B", status: "CLOSED", priority: "LOW", reviewed: true }, { user } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(db.supportTicket.update).not.toHaveBeenCalled();
  });
  it("réouvre un ticket résolu lorsque l’entreprise répond", async () => {
    db.supportTicket.findFirst.mockResolvedValue({ id: "T", status: "RESOLVED" });
    await replyTicket({ ticketId: "T", body: "Toujours présent" }, { user } as never);
    expect(db.supportTicket.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "OPEN", reviewed: false, messages: { create: expect.objectContaining({ isStaff: false }) } }) }));
  });
});
describe("Confirmation de facturation", () => {
  const event = (status: string) => ({
    type: "customer.subscription.updated", created: 123,
    data: { object: { id: "sub_A", customer: "cus_A", status, metadata: { workspaceId: "A" },
      items: { data: [{ price: { id: "price_Test", currency: "eur", unit_amount: 1000, recurring: { interval: "month", interval_count: 1 } } }] },
    } },
  });
  it("associe l’abonnement à l’entreprise et ignore les événements anciens", async () => {
    db.workspace.findUnique.mockResolvedValue({ id: "A", stripeSubscriptionId: "sub_A" }); db.saasPlan.findUnique.mockResolvedValue({ id: "p", ...plan });
    expect(await handleWorkspaceStripeEvent(event("active") as never)).toBe(true);
    expect(db.workspace.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "A", OR: [{ billingUpdatedAt: null }, { billingUpdatedAt: { lte: new Date(123000) } }] }, data: expect.objectContaining({ planId: "p", subscriptionStatus: "active" }) }));
  });
  it("refuse un abonnement qui prétend appartenir à une autre entreprise", async () => {
    db.workspace.findUnique.mockResolvedValue({ id: "B" });
    await expect(handleWorkspaceStripeEvent(event("active") as never)).rejects.toThrow("incohérente");
    expect(db.workspace.updateMany).not.toHaveBeenCalled();
  });
});
