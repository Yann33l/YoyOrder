import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("wasp/server", async () => {
  const { PrismaClient } = await import("@prisma/client");
  return { prisma: new PrismaClient(), HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } };
});
vi.mock("wasp/server/auth", () => ({ createUser: vi.fn(), createProviderId: vi.fn(), sanitizeAndSerializeProviderData: vi.fn(), createEmailVerificationLink: vi.fn() }));
vi.mock("../payment/stripe/stripeClient", () => ({ stripeClient: {} }));
import { prisma } from "wasp/server";
import type { User } from "wasp/entities";
import { workspaceDb } from "./workspace";
import { getCatalog, saveCatalogItem, createRequest, registerReception, downloadCertificate, getHistory } from "./workflows";
import { withUserQuota } from "./quotas";
import { createTicket, getTickets, replyTicket } from "../saas/tickets";
import { getCompanyNews, saveCompanyNews } from "./news";
const enabled = process.env.SAAS_INTEGRATION_TEST === "true";
describe.skipIf(!enabled)("Isolation SaaS avec PostgreSQL réel", () => {
  const ids = [randomUUID(), randomUUID()]; const planId = randomUUID();
  let a: User, b: User; let articleA: number, articleB: number, sectorA: number, supplierB: number, orderA: number, ticketB: string;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.endsWith("/yoyorder_wsl_test")) throw new Error("Ces tests sont réservés à la base WSL locale");
    await prisma.saasPlan.create({ data: { id: planId, name: "Test temporaire", maxUsers: 2, storageMb: 1 } });
    for (const id of ids) await prisma.workspace.create({ data: { id, name: "Test temporaire", planId } });
    const makeUser = (workspaceId: string) => prisma.user.create({ data: { workspaceId, email: `${randomUUID()}@example.test`, isAuthorized: true, isAdmin: true, isEditor: true, isRequester: true, isBuyer: true } });
    a = await makeUser(ids[0]); b = await makeUser(ids[1]);
    sectorA = (await workspaceDb(a).sector.create({ data: { label: "Secteur A" } })).id;
    const supplier = await workspaceDb(b).supplier.create({ data: { label: "Fournisseur B" } }); supplierB = supplier.id;
    articleA = (await workspaceDb(a).article.create({ data: { label: "Article A", sectors: { create: { sectorId: sectorA } } } })).id;
    articleB = (await workspaceDb(b).article.create({ data: { label: "Article B", supplierId: supplierB } })).id;
    orderA = (await workspaceDb(a).order.create({ data: { articleId: articleA, requestedByUserId: a.id, requestDate: new Date("2026-10-10"), orderDate: new Date("2026-10-11"), sectors: { create: { sectorId: sectorA, quantity: 10 } } } })).id;
    ticketB = (await createTicket({ title: "Ticket de B", category: "SUPPORT", body: "Assistance" }, { user: b } as never)).id;
  });
  afterAll(async () => {
    const scope = { workspaceId: { in: ids } };
    await prisma.ticketMessage.deleteMany({ where: { ticket: scope } }); await prisma.supportTicket.deleteMany({ where: scope });
    await prisma.workspaceNews.deleteMany({ where: scope });
    await prisma.receptionStock.deleteMany({ where: { reception: scope } }); await prisma.stock.deleteMany({ where: scope }); await prisma.reception.deleteMany({ where: scope });
    await prisma.orderSector.deleteMany({ where: { order: scope } }); await prisma.order.deleteMany({ where: scope });
    await prisma.article.deleteMany({ where: scope }); await prisma.supplier.deleteMany({ where: scope }); await prisma.sector.deleteMany({ where: scope });
    await prisma.user.deleteMany({ where: scope }); await prisma.workspace.deleteMany({ where: { id: { in: ids } } }); await prisma.saasPlan.deleteMany({ where: { id: planId } }); await prisma.$disconnect();
  });
  it("le catalogue d’un administrateur ne contient aucun article de l’autre entreprise", async () => {
    expect((await getCatalog({}, { user: a } as never)).articles.map((article) => article.id)).toEqual([articleA]);
    expect(await workspaceDb(a).article.findUnique({ where: { id: articleB } })).toBeNull();
    expect(await workspaceDb(a).articleSector.findUnique({ where: { articleId_sectorId: { articleId: articleA, sectorId: sectorA } } })).not.toBeNull();
    expect(await workspaceDb(b).articleSector.findUnique({ where: { articleId_sectorId: { articleId: articleA, sectorId: sectorA } } })).toBeNull();
  });
  it("refuse la modification et les références étrangères même avec un identifiant connu", async () => {
    await expect(saveCatalogItem({ kind: "article", id: articleB, label: "Intrusion", sectorIds: [sectorA] }, { user: a } as never)).rejects.toThrow();
    await expect(saveCatalogItem({ kind: "article", label: "Intrusion", supplierId: supplierB, sectorIds: [sectorA] }, { user: a } as never)).rejects.toMatchObject({ statusCode: 400 });
    await expect(createRequest({ articleId: articleB, sectors: [{ sectorId: sectorA, quantity: 1 }], requestDate: "2026-10-10" }, { user: a } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect((await prisma.article.findUnique({ where: { id: articleB } }))?.label).toBe("Article B");
  });
  it("isole l’historique, les réceptions et les certificats", async () => {
    const stock = await registerReception({ orderId: orderA, quantity: 1, receivedAt: "2026-10-12", lot: "TEST", coaBase64: Buffer.from("pdf").toString("base64") }, { user: a } as never);
    expect((await prisma.stock.findUnique({ where: { id: stock.id } }))?.workspaceId).toBe(a.workspaceId);
    expect(await getHistory({}, { user: b } as never)).toEqual([]);
    await expect(downloadCertificate({ stockId: stock.id }, { user: b } as never)).rejects.toMatchObject({ statusCode: 404 });
    await expect(registerReception({ orderId: orderA, quantity: 1, receivedAt: "2026-10-12", lot: "INTRUSION" }, { user: b } as never)).rejects.toMatchObject({ statusCode: 404 });
    expect((await downloadCertificate({ stockId: stock.id }, { user: a } as never))?.base64).toBe(Buffer.from("pdf").toString("base64"));
  });
  it("applique le quota de stockage et annule toute la réception en cas de dépassement", async () => {
    await expect(registerReception({ orderId: orderA, quantity: 1, receivedAt: "2026-10-12", lot: "TROP", coaBase64: Buffer.alloc(1024 * 1024).toString("base64") }, { user: a } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.reception.count({ where: { orderId: orderA } })).toBe(1);
  });
  it("sérialise les activations concurrentes à la dernière place disponible", async () => {
    const create = () => prisma.user.create({ data: { workspaceId: a.workspaceId, isAuthorized: true } });
    const results = await Promise.allSettled([withUserQuota(a.workspaceId!, create), withUserQuota(a.workspaceId!, create)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.count({ where: { workspaceId: a.workspaceId, isAuthorized: true } })).toBe(2);
  });
  it("ne révèle ni la conversation ni les tickets d’une autre entreprise", async () => {
    expect(await getTickets({}, { user: a } as never)).toEqual([]);
    await expect(replyTicket({ ticketId: ticketB, body: "Intrusion" }, { user: a } as never)).rejects.toMatchObject({ statusCode: 404 });
    expect((await getTickets({}, { user: b } as never))[0].messages).toHaveLength(1);
  });
  it("réserve les actualités à l’entreprise et cache les brouillons aux utilisateurs", async () => {
    const news = await saveCompanyNews({ title: "Brouillon B", body: "Interne", published: false }, { user: b } as never);
    expect(await getCompanyNews({}, { user: a } as never)).toEqual([]);
    expect(await getCompanyNews({}, { user: { ...b, isAdmin: false } } as never)).toEqual([]);
    expect((await getCompanyNews({}, { user: b } as never)).map((item) => item.id)).toEqual([news.id]);
    await expect(saveCompanyNews({ id: news.id, title: "Intrusion", body: "Test", published: true }, { user: a } as never)).rejects.toThrow();
    await saveCompanyNews({ id: news.id, title: "Actualité B", body: "Publiée", published: true }, { user: b } as never);
    expect((await getCompanyNews({}, { user: { ...b, isAdmin: false } } as never))[0].title).toBe("Actualité B");
    await expect(saveCompanyNews({ title: "Interdit", body: "Test", published: true }, { user: { ...b, isAdmin: false, isSuperAdmin: true } } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
});
