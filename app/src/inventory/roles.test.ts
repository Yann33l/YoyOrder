import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error { constructor(public statusCode: number, message: string) { super(message); } },
  prisma: { $transaction: vi.fn(), order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() }, stock: { findUnique: vi.fn(), update: vi.fn() }, articleSector: { findUnique: vi.fn() }, userSector: { findUnique: vi.fn(), findMany: vi.fn() }, article: { findMany: vi.fn() }, sector: { findMany: vi.fn() }, piece: { findMany: vi.fn() }, supplier: { findMany: vi.fn() } },
}));
import { prisma } from "wasp/server";
import { createRequest, setOrderPurchase, setBatchOrderPurchase, registerReception, updateStock, createArticle, getCatalog } from "./workflows";
import { hasBusinessRole } from "./permissions";
const editor = { id: "editor", isAdmin: true, isAuthorized: true, isRequester: false, isBuyer: false, isEditor: true };
describe("Demandes par secteur et visibilité du catalogue", () => {
  beforeEach(() => vi.resetAllMocks());
  const requester = { ...editor, isAdmin: false, isRequester: true };
  const input = { articleId: 1, sectors: [{ sectorId: 10, quantity: 2 }, { sectorId: 20, quantity: 3 }], requestDate: "2026-10-10" };
  it("enregistre une demande unique avec les quantités de plusieurs secteurs", async () => {
    vi.mocked(prisma.userSector.findUnique).mockResolvedValue({ sectorId: 10 } as never);
    vi.mocked(prisma.articleSector.findUnique).mockResolvedValue({ articleId: 1 } as never);
    await createRequest(input, { user: requester } as never);
    expect(prisma.order.create).toHaveBeenCalledOnce();
    expect(prisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sectors: { create: input.sectors } }) }));
  });
  it("refuse toute la demande si un secteur n’est pas affecté à l’utilisateur", async () => {
    vi.mocked(prisma.userSector.findUnique).mockResolvedValueOnce({ sectorId: 10 } as never).mockResolvedValueOnce(null);
    vi.mocked(prisma.articleSector.findUnique).mockResolvedValue({ articleId: 1 } as never);
    await expect(createRequest(input, { user: requester } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
  it("refuse un article incompatible avec le secteur demandé", async () => {
    vi.mocked(prisma.userSector.findUnique).mockResolvedValue({ sectorId: 10 } as never);
    vi.mocked(prisma.articleSector.findUnique).mockResolvedValue(null);
    await expect(createRequest(input, { user: requester } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
  it("refuse les secteurs dupliqués et les quantités nulles", async () => {
    await expect(createRequest({ ...input, sectors: [input.sectors[0], input.sectors[0]] }, { user: requester } as never)).rejects.toMatchObject({ statusCode: 400 });
    await expect(createRequest({ ...input, sectors: [{ sectorId: 10, quantity: 0 }] }, { user: requester } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
  it("filtre les articles, leurs secteurs et les pièces côté serveur selon les affectations", async () => {
    vi.mocked(prisma.userSector.findMany).mockResolvedValue([{ sectorId: 10 }] as never);
    for (const model of [prisma.article, prisma.sector, prisma.piece, prisma.supplier]) vi.mocked(model.findMany).mockResolvedValue([] as never);
    await getCatalog({}, { user: requester } as never);
    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sectors: { some: { sectorId: { in: [10] } } } }, select: expect.objectContaining({ sectors: { where: { sectorId: { in: [10] } }, select: { sectorId: true } } }) }));
    expect(prisma.piece.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { articles: { some: { article: { sectors: { some: { sectorId: { in: [10] } } } } } } } }));
  });
});
describe("Droits métier indépendants de l’administration", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    ["demande", createRequest], ["commande", setOrderPurchase], ["commande groupée", setBatchOrderPurchase], ["réception", registerReception], ["stock", updateStock],
  ])("refuse une mutation %s à un éditeur, même administrateur", async (_name, action) => {
    await expect(action({} as never, { user: editor } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.stock.update).not.toHaveBeenCalled();
  });
  it("refuse la création de référentiels sans rôle éditeur", async () => {
    await expect(createArticle({} as never, { user: { ...editor, isEditor: false } } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("respecte chaque rôle coché et refuse un compte désactivé", () => {
    expect(hasBusinessRole(editor, "isEditor")).toBe(true);
    expect(hasBusinessRole(editor, "isBuyer")).toBe(false);
    expect(hasBusinessRole(editor, "isRequester")).toBe(false);
    expect(hasBusinessRole({ ...editor, isAuthorized: false }, "isEditor")).toBe(false);
  });
});

describe("Chronologie des commandes", () => {
  beforeEach(() => vi.clearAllMocks());
  const buyer = { ...editor, isBuyer: true };
  it("refuse le 09/10 pour une demande du 10/10 sans modifier la commande", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 1, requestDate: new Date("2026-10-10T00:00:00Z"), sectors: [] } as never);
    await expect(setOrderPurchase({ orderId: 1, orderDate: "2026-10-09" }, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 400, message: "La date de commande ne peut pas être antérieure à la date de demande" });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
  it.each(["2026-10-10", "2026-10-11"])("accepte la date %s pour une demande du 10/10", async (orderDate) => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 1, requestDate: new Date("2026-10-10T00:00:00Z"), sectors: [] } as never);
    await setOrderPurchase({ orderId: 1, orderDate }, { user: buyer } as never);
    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderDate: new Date(`${orderDate}T00:00:00Z`) }) }));
  });
});
