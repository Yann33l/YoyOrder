import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ order: { findMany: vi.fn(), updateMany: vi.fn() }, userSector: { findMany: vi.fn() }, $transaction: vi.fn() }));
vi.mock("./workspace", () => ({ workspaceDb: () => db, validateReferences: vi.fn() }));
vi.mock("./quotas", () => ({ withUserQuota: (_id: string, callback: () => unknown) => callback(), checkStorageQuota: vi.fn() }));
vi.mock("wasp/server", () => ({ prisma: { ...db, workspace: { findUnique: async () => ({ enabled: true, name: "Test", plan: null }) } }, HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
import { setBatchOrderPurchase } from "./workflows";
const buyer = { id: "buyer", workspaceId: "legacy", isSuperAdmin: false, isAuthorized: true, isAdmin: false, isBuyer: true, isRequester: false, isEditor: false };
const input = { orderIds: [1, 2], orderDate: "2026-10-11", orderNumber: "C-2026-42", comment: "Commande commune" };
const order = (id: number, supplierId = 10, requestDate = "2026-10-10") => ({ id, orderDate: null, requestDate: new Date(`${requestDate}T00:00:00Z`), article: { supplierId }, sectors: [{ sectorId: 1 }] });
describe("Enregistrement groupé des commandes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation(async (callback) => callback(db));
    db.userSector.findMany.mockResolvedValue([{ sectorId: 1 }]);
    db.order.findMany.mockResolvedValue([order(1), order(2)]);
    db.order.updateMany.mockResolvedValue({ count: 2 });
  });
  it("enregistre tous les articles avec une date, un numéro et un commentaire communs", async () => {
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).resolves.toEqual({ count: 2 });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.order.updateMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2] }, orderDate: null }, data: { orderNumber: input.orderNumber, comment: input.comment, orderDate: new Date("2026-10-11T00:00:00Z") } });
  });
  it("refuse une sélection de fournisseurs différents sans écrire", async () => {
    db.order.findMany.mockResolvedValue([order(1), order(2, 20)]);
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("refuse une date antérieure à l’une des demandes sélectionnées", async () => {
    db.order.findMany.mockResolvedValue([order(1), order(2, 10, "2026-10-12")]);
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("refuse une demande déjà commandée", async () => {
    db.order.findMany.mockResolvedValue([order(1), { ...order(2), orderDate: new Date() }]);
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 409 });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("refuse un secteur non affecté à l’acheteur", async () => {
    db.order.findMany.mockResolvedValue([order(1), { ...order(2), sectors: [{ sectorId: 2 }] }]);
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("refuse une demande disparue et une sélection vide", async () => {
    db.order.findMany.mockResolvedValue([order(1)]);
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 404 });
    await expect(setBatchOrderPurchase({ ...input, orderIds: [] }, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("annule la transaction si la sélection change pendant l’enregistrement", async () => {
    db.order.updateMany.mockResolvedValue({ count: 1 });
    await expect(setBatchOrderPurchase(input, { user: buyer } as never)).rejects.toMatchObject({ statusCode: 409 });
  });
});
