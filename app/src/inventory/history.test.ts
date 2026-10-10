import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ order: { findMany: vi.fn() }, userSector: { findMany: vi.fn() }, stock: { findUnique: vi.fn() } }));
vi.mock("wasp/server", () => ({ prisma: db, HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
import { getHistory, downloadCertificate } from "./workflows";
const user = { id: "reader", isAuthorized: true, isAdmin: false, isRequester: false, isBuyer: true, isEditor: false };
const order = {
  id: 1, orderNumber: "CMD-123", requestDate: new Date("2026-10-01"), orderDate: new Date("2026-10-02"), receivedInFull: true, requesterComment: "Demande", comment: "Commande",
  requestedBy: { email: "test@example.com" }, article: { label: "Article", reference: "REF", packaging: "Boîte", supplier: { label: "Fournisseur" } },
  sectors: [{ quantity: 3, sector: { label: "ACP" } }], receptions: [] as unknown[],
};
describe("Historique et certificats", () => {
  beforeEach(() => { vi.resetAllMocks(); db.userSector.findMany.mockResolvedValue([{ sectorId: 10 }]); });
  it("garde les commandes sans réception et filtre les secteurs côté serveur", async () => {
    db.order.findMany.mockResolvedValue([order]);
    const rows = await getHistory({}, { user } as never);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ orderNumber: "CMD-123", stockId: null, receptionId: null, requestedQty: 3, sectors: "ACP : 3" });
    expect(db.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sectors: { some: { sectorId: { in: [10] } } } }, select: expect.objectContaining({ sectors: expect.objectContaining({ where: { sectorId: { in: [10] } } }) }) }));
  });
  it("conserve tous les lots épuisés et périmés, sans envoyer le PDF dans la grille", async () => {
    const stock = { id: 4, lot: "LOT", expiresAt: new Date("2026-01-01"), initialQty: 2, remainingQty: 0, coa: Buffer.from("pdf") };
    const reception = { id: 5, quantity: 3, receivedAt: new Date("2026-10-03"), comment: "Réception", useStartedAt: null, useEndedAt: null, remainingQty: 0, subOrder: null, stocks: [{ stock }, { stock: { ...stock, id: 6 } }] };
    db.order.findMany.mockResolvedValue([{ ...order, receptions: [reception] }]);
    const rows = await getHistory({}, { user } as never);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
    expect(rows[0]).toMatchObject({ remainingQty: 0, expiresAt: stock.expiresAt, hasCertificate: true, receivedAt: reception.receivedAt, receptionComment: "Réception" });
    expect(rows[0]).not.toHaveProperty("coa");
  });
  it("conserve une réception sans lot", async () => {
    db.order.findMany.mockResolvedValue([{ ...order, receptions: [{ id: 5, quantity: 3, receivedAt: null, stocks: [] }] }]);
    expect((await getHistory({}, { user } as never))[0]).toMatchObject({ receptionId: 5, stockId: null, receivedQty: 3 });
  });
  it("refuse les comptes désactivés et les éditeurs sans droit de consultation", async () => {
    await expect(getHistory({}, { user: { ...user, isAuthorized: false } } as never)).rejects.toMatchObject({ statusCode: 403 });
    await expect(getHistory({}, { user: { ...user, isBuyer: false, isEditor: true } } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(db.order.findMany).not.toHaveBeenCalled();
  });
  it("permet à un acheteur de consulter le certificat mais refuse un autre secteur", async () => {
    db.stock.findUnique.mockResolvedValue({ lot: "LOT", coa: Buffer.from("pdf"), receptions: [{ reception: { order: { sectors: [{ sectorId: 10 }] } } }] });
    expect(await downloadCertificate({ stockId: 4 }, { user } as never)).toMatchObject({ filename: "certificat-LOT.pdf" });
    db.userSector.findMany.mockResolvedValue([{ sectorId: 20 }]);
    await expect(downloadCertificate({ stockId: 4 }, { user } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
});
