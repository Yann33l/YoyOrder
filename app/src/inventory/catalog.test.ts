import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  article: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  articleSector: { deleteMany: vi.fn(), createMany: vi.fn() }, articlePiece: { deleteMany: vi.fn(), createMany: vi.fn() },
  articleSubArticle: { upsert: vi.fn(), deleteMany: vi.fn() },
  subArticle: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  userSector: { findMany: vi.fn(), findUnique: vi.fn() }, supplier: { update: vi.fn(), create: vi.fn() },
  sector: { update: vi.fn(), create: vi.fn() }, piece: { update: vi.fn(), create: vi.fn(), findFirst: vi.fn() }, $transaction: vi.fn(),
}));
vi.mock("wasp/server", () => ({ prisma: db, HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
import { saveCatalogItem, setArticleComposition } from "./workflows";
const editor = { id: "editor", isAuthorized: true, isAdmin: false, isEditor: true, isRequester: false, isBuyer: false };
describe("Gestion des référentiels et compositions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.userSector.findMany.mockResolvedValue([{ sectorId: 10 }]);
    db.userSector.findUnique.mockResolvedValue({ sectorId: 10 });
    db.article.findUnique.mockResolvedValue({ sectors: [{ sectorId: 10 }] });
    db.article.update.mockResolvedValue({ id: 1 });
    db.subArticle.findUnique.mockResolvedValue({ id: 2 });
    db.$transaction.mockImplementation(async (callback) => callback(db));
  });
  it("modifie un fournisseur avec ses coordonnées", async () => {
    await saveCatalogItem({ kind: "supplier", id: 5, label: "Fournisseur", telephone: "0123456789", email: "contact@example.com", website: "https://example.com" }, { user: editor } as never);
    expect(db.supplier.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { label: "Fournisseur", telephone: "0123456789", email: "contact@example.com", website: "https://example.com" } });
  });
  it("met à jour les secteurs et plusieurs pièces dans la même transaction", async () => {
    await saveCatalogItem({ kind: "article", id: 1, label: "Kit", sectorIds: [10], pieceIds: [3, 4, 3] }, { user: editor } as never);
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.articlePiece.createMany).toHaveBeenCalledWith({ data: [{ articleId: 1, pieceId: 3 }, { articleId: 1, pieceId: 4 }] });
  });
  it("refuse la modification d’un article d’un autre secteur", async () => {
    db.article.findUnique.mockResolvedValue({ sectors: [{ sectorId: 20 }] });
    await expect(saveCatalogItem({ kind: "article", id: 1, label: "Kit", sectorIds: [10] }, { user: editor } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("ajoute ou ajuste la quantité d’un composant", async () => {
    await setArticleComposition({ articleId: 1, subArticleId: 2, quantity: 4 }, { user: editor } as never);
    expect(db.articleSubArticle.upsert).toHaveBeenCalledWith({ where: { articleId_subArticleId: { articleId: 1, subArticleId: 2 } }, create: { articleId: 1, subArticleId: 2, quantity: 4 }, update: { quantity: 4 } });
  });
  it("retire uniquement l’association quand la quantité vaut zéro", async () => {
    await setArticleComposition({ articleId: 1, subArticleId: 2, quantity: 0 }, { user: editor } as never);
    expect(db.articleSubArticle.deleteMany).toHaveBeenCalledWith({ where: { articleId: 1, subArticleId: 2 } });
    expect(db.subArticle.update).not.toHaveBeenCalled();
  });
  it("refuse la composition d’un article non accessible et un composant inexistant", async () => {
    db.article.findUnique.mockResolvedValueOnce({ sectors: [{ sectorId: 20 }] });
    await expect(setArticleComposition({ articleId: 1, subArticleId: 2, quantity: 4 }, { user: editor } as never)).rejects.toMatchObject({ statusCode: 403 });
    db.subArticle.findUnique.mockResolvedValueOnce(null);
    await expect(setArticleComposition({ articleId: 1, subArticleId: 2, quantity: 4 }, { user: editor } as never)).rejects.toMatchObject({ statusCode: 404 });
    expect(db.articleSubArticle.upsert).not.toHaveBeenCalled();
  });
});
