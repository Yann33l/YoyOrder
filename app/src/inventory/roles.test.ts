import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error { constructor(public statusCode: number, message: string) { super(message); } },
  prisma: { order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() }, stock: { findUnique: vi.fn(), update: vi.fn() }, articleSector: { findUnique: vi.fn() }, userSector: { findUnique: vi.fn() } },
}));
import { prisma } from "wasp/server";
import { createRequest, setOrderPurchase, registerReception, updateStock, createArticle } from "./workflows";
import { hasBusinessRole } from "./permissions";
const editor = { id: "editor", isAdmin: true, isAuthorized: true, isRequester: false, isBuyer: false, isEditor: true };
describe("Droits métier indépendants de l’administration", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    ["demande", createRequest], ["commande", setOrderPurchase], ["réception", registerReception], ["stock", updateStock],
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
