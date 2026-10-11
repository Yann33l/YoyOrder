import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ accessRole: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }, user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, userSector: { findMany: vi.fn() }, article: { findFirst: vi.fn(), findMany: vi.fn() }, sector: { count: vi.fn(), findMany: vi.fn() }, piece: { count: vi.fn(), findMany: vi.fn() }, supplier: { findMany: vi.fn() }, subArticle: { findMany: vi.fn() }, articleSubArticle: { findMany: vi.fn() }, stock: { findUnique: vi.fn() } }));
const auth = vi.hoisted(() => ({ createUser: vi.fn(), createProviderId: vi.fn(), sanitizeAndSerializeProviderData: vi.fn(), createEmailVerificationLink: vi.fn() }));
vi.mock("./workspace", () => ({ workspaceDb: () => db, validateReferences: vi.fn() }));
vi.mock("./quotas", () => ({ withUserQuota: (_id: string, callback: () => unknown) => callback(), checkStorageQuota: vi.fn() }));
vi.mock("wasp/server", () => ({ prisma: { ...db, workspace: { findUnique: async () => ({ enabled: true, name: "Test", plan: null }) } }, HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
vi.mock("wasp/server/auth", () => auth);
import { resolveAccess, requireActiveUser, isAccountValid, accessSectorIds, assertArticleVisible, assertPieceSelection, orderScope } from "./access";
import { getAccessAdministration, saveAccessRole, saveManagedUser, createManagedUser } from "./admin";
import { createRequest, getCatalog, downloadCertificate } from "./workflows";
const user = { id: "dcd5c759-67c8-4c5d-8023-8e4e9573b89c", workspaceId: "legacy", isSuperAdmin: false, isAdmin: false, isAuthorized: true, isRequester: false, isBuyer: false, isEditor: false, validUntil: null, roleIds: [1] };
const admin = { ...user, isAdmin: true, roleIds: [] };
const role = { id: 1, name: "Technicien ACP", isRequester: true, isBuyer: false, isEditor: false, sectorIds: [10], pieceIds: [20] };
describe("Rôles personnalisés et administration", () => {
  beforeEach(() => { vi.resetAllMocks(); db.accessRole.findMany.mockResolvedValue([role]); db.accessRole.findFirst.mockResolvedValue(null); db.sector.count.mockResolvedValue(1); db.piece.count.mockResolvedValue(1); });
  it("calcule les permissions et les visibilités des rôles plutôt que les anciennes cases", async () => {
    const access = await resolveAccess({ ...user, isBuyer: true } as never);
    expect(access).toMatchObject({ isRequester: true, isBuyer: false, roleSectorIds: [10], rolePieceIds: [20] });
    expect(await accessSectorIds(access)).toEqual([10]);
    expect(db.userSector.findMany).not.toHaveBeenCalled();
    expect(orderScope(access, [10])).toMatchObject({ article: { pieces: { some: { pieceId: { in: [20] } } } } });
  });
  it("cumule plusieurs rôles sans dupliquer les affectations", async () => {
    db.accessRole.findMany.mockResolvedValue([role, { ...role, id: 2, isBuyer: true, sectorIds: [10, 11], pieceIds: [20, 21] }]);
    expect(await resolveAccess({ ...user, roleIds: [1, 2] } as never)).toMatchObject({ isBuyer: true, roleSectorIds: [10, 11], rolePieceIds: [20, 21] });
  });
  it("préserve les accès existants des utilisateurs sans rôle personnalisé", async () => {
    db.userSector.findMany.mockResolvedValue([{ sectorId: 4 }]);
    const access = await resolveAccess({ ...user, roleIds: [], isEditor: true } as never);
    expect(access.isEditor).toBe(true); expect(await accessSectorIds(access)).toEqual([4]);
    expect(db.accessRole.findMany).not.toHaveBeenCalled();
  });
  it("ne donne aucun accès lorsqu’un rôle attribué est introuvable", async () => {
    db.accessRole.findMany.mockResolvedValue([]);
    expect(await resolveAccess(user as never)).toMatchObject({ isRequester: false, roleSectorIds: [], rolePieceIds: [] });
  });
  it("respecte la fin de validité inclusive dans le fuseau de Paris, y compris à minuit", async () => {
    const account = { isAuthorized: true, validUntil: new Date("2026-10-10T00:00:00Z") };
    expect(isAccountValid(account, new Date("2026-10-10T21:59:00Z"))).toBe(true);
    expect(isAccountValid(account, new Date("2026-10-10T22:00:00Z"))).toBe(false);
    expect(isAccountValid({ isAuthorized: false })).toBe(false);
    await expect(requireActiveUser({ user: { ...user, validUntil: new Date("2000-01-01") } as never })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("refuse un article invisible et les sélections de pièces non autorisées", async () => {
    const access = await resolveAccess(user as never);
    db.article.findFirst.mockResolvedValue(null);
    await expect(assertArticleVisible(access, 1)).rejects.toMatchObject({ statusCode: 403 });
    expect(() => assertPieceSelection(access, [21])).toThrow();
    expect(() => assertPieceSelection(access, [])).toThrow();
    expect(() => assertPieceSelection(access, [20])).not.toThrow();
  });
  it("refuse une demande directe pour une pièce invisible avant toute création", async () => {
    db.article.findFirst.mockResolvedValue(null);
    await expect(createRequest({ articleId: 1, sectors: [{ sectorId: 10, quantity: 1 }], requestDate: "2026-10-10" }, { user } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("filtre les articles et pièces visibles par rôle côté serveur", async () => {
    for (const model of [db.article, db.sector, db.piece, db.supplier, db.subArticle, db.articleSubArticle]) model.findMany.mockResolvedValue([]);
    await getCatalog({}, { user } as never);
    expect(db.article.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sectors: { some: { sectorId: { in: [10] } } }, pieces: { some: { pieceId: { in: [20] } } } } }));
    expect(db.piece.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: [20] } }) }));
  });
  it("refuse un certificat d’une pièce invisible même si le secteur est autorisé", async () => {
    db.stock.findUnique.mockResolvedValue({ lot: "LOT", coa: Buffer.from("pdf"), receptions: [{ reception: { order: { sectors: [{ sectorId: 10 }], article: { pieces: [{ pieceId: 21 }] } } } }] });
    await expect(downloadCertificate({ stockId: 1 }, { user } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
  it.each([getAccessAdministration, saveAccessRole, saveManagedUser, createManagedUser])("réserve l’administration aux administrateurs", async (operation) => {
    await expect(operation({} as never, { user } as never)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("enregistre un rôle avec ses permissions, secteurs et pièces", async () => {
    db.accessRole.create.mockResolvedValue({ id: 1 });
    await saveAccessRole({ name: role.name, isRequester: true, isBuyer: false, isEditor: false, sectorIds: [10, 10], pieceIds: [20] }, { user: admin } as never);
    expect(db.accessRole.create).toHaveBeenCalledWith({ data: { name: role.name, isRequester: true, isBuyer: false, isEditor: false, sectorIds: [10], pieceIds: [20] } });
  });
  it("refuse une pièce inexistante dans un rôle", async () => {
    db.piece.count.mockResolvedValue(0);
    await expect(saveAccessRole({ name: role.name, isRequester: true, isBuyer: false, isEditor: false, sectorIds: [10], pieceIds: [20] }, { user: admin } as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.accessRole.create).not.toHaveBeenCalled();
  });
  it("archive sans supprimer les données et empêche l’archivage de son propre compte", async () => {
    const input = { userId: "12cfc802-6549-4bf2-b466-54e721c9f970", isAuthorized: true, validUntil: "2000-01-01", roleIds: [1] };
    await saveManagedUser(input, { user: admin } as never);
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ validUntil: new Date("2000-01-01T00:00:00Z"), roleIds: [1] }) }));
    await expect(saveManagedUser({ ...input, userId: admin.id }, { user: admin } as never)).rejects.toMatchObject({ statusCode: 400 });
  });
  it("crée un vrai compte Wasp avec mot de passe haché et email à vérifier", async () => {
    db.user.findFirst.mockResolvedValue(null); auth.createUser.mockResolvedValue({ id: "new" }); auth.sanitizeAndSerializeProviderData.mockResolvedValue("hashed-data"); auth.createProviderId.mockReturnValue("provider"); auth.createEmailVerificationLink.mockResolvedValue("verification-link");
    expect(await createManagedUser({ email: "TEST@example.com", password: "initial-password", isAuthorized: true, validUntil: null, roleIds: [1] }, { user: admin } as never)).toEqual({ id: "new", verificationLink: "verification-link" });
    expect(auth.sanitizeAndSerializeProviderData).toHaveBeenCalledWith(expect.objectContaining({ isEmailVerified: false, hashedPassword: "initial-password" }));
    expect(auth.createUser).toHaveBeenCalledWith("provider", "hashed-data", expect.objectContaining({ email: "test@example.com", roleIds: [1], isAuthorized: true }));
  });
});
