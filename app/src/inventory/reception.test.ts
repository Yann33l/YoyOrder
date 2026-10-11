import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ order: { findUnique: vi.fn(), findMany: vi.fn() }, userSector: { findMany: vi.fn() }, $transaction: vi.fn() }));
vi.mock("./workspace", () => ({ workspaceDb: () => db, validateReferences: vi.fn() }));
vi.mock("./quotas", () => ({ withUserQuota: (_id: string, callback: () => unknown) => callback(), checkStorageQuota: vi.fn() }));
vi.mock("wasp/server", () => ({ prisma: { ...db, workspace: { findUnique: async () => ({ enabled: true, name: "Test", plan: null }) } }, HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
import { getOrders, registerReception } from "./workflows";
const user = { id: "requester", workspaceId: "legacy", isSuperAdmin: false, isAuthorized: true, isAdmin: false, isRequester: true };
const input = { orderId: 1, quantity: 2, receivedAt: "2026-10-10", lot: "LOT-1", expiresAt: "2027-10-10", coaBase64: Buffer.from("pdf").toString("base64") };
const tx = { reception: { aggregate: vi.fn(), create: vi.fn() }, stock: { create: vi.fn() }, order: { update: vi.fn() } };
describe("Réceptions depuis les commandes en attente", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.userSector.findMany.mockResolvedValue([{ sectorId: 10 }]);
    db.order.findUnique.mockResolvedValue({ id: 1, orderDate: new Date("2026-10-09"), receivedInFull: false, sectors: [{ sectorId: 10, quantity: 5 }] });
    db.$transaction.mockImplementation((callback) => callback(tx));
    tx.reception.aggregate.mockResolvedValue({ _sum: { quantity: 1 } });
    tx.reception.create.mockResolvedValue({ id: 3 });
    tx.stock.create.mockResolvedValue({ id: 4 });
  });
  it("calcule les totaux et le déjà reçu sans exposer les libellés des autres secteurs", async () => {
    db.order.findMany.mockResolvedValue([{ id: 1, sectors: [{ quantity: 3, sector: { id: 10, label: "ACP" } }, { quantity: 2, sector: { id: 20, label: "PAM" } }], receptions: [{ quantity: 1 }, { quantity: 2 }] }]);
    expect((await getOrders({}, { user } as never))[0]).toMatchObject({ quantityOrdered: 5, receivedQty: 3, sectors: [{ quantity: 3, sector: { id: 10, label: "ACP" } }] });
  });
  it("une réception partielle crée son lot et son certificat et conserve la commande en attente", async () => {
    await registerReception(input, { user } as never);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.stock.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lot: "LOT-1", initialQty: 2, coa: Buffer.from("pdf"), receptions: { create: { receptionId: 3 } } }) }));
  });
  it("la dernière réception termine la commande", async () => {
    await registerReception({ ...input, quantity: 4 }, { user } as never);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { receivedInFull: true } });
  });
  it("refuse une quantité supérieure au reste avant de créer la réception", async () => {
    await expect(registerReception({ ...input, quantity: 5 }, { user } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.reception.create).not.toHaveBeenCalled();
  });
  it.each([{ receivedAt: "2026-10-08" }, { expiresAt: "2026-10-09" }])("refuse les dates incohérentes %o", async (dates) => {
    await expect(registerReception({ ...input, ...dates }, { user } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("refuse les réceptions sur une commande d’un autre secteur", async () => {
    db.userSector.findMany.mockResolvedValue([{ sectorId: 20 }]);
    await expect(registerReception(input, { user } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
