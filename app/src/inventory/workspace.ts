import { HttpError, prisma } from "wasp/server";
import type { User } from "wasp/entities";

const directModels = new Set(["User", "AccessRole", "Sector", "Piece", "Supplier", "Article", "SubArticle", "Order", "Reception", "Stock", "WorkspaceNews"]);
const parentModels: Record<string, string> = { UserSector: "user", ArticleSector: "article", ArticlePiece: "article", ArticleSubArticle: "article", OrderSector: "order", SubOrder: "order", ReceptionStock: "reception" };
export function scopedArgs(model: string, operation: string, args: Record<string, unknown>, workspaceId: string): Record<string, unknown> {
  if (!directModels.has(model) && !parentModels[model]) throw new HttpError(403, "Modèle hors de l’espace de travail");
  const scoped = { ...args };
  const data = (input: unknown) => {
    const row = input as Record<string, unknown>;
    if (("workspaceId" in row && row.workspaceId !== workspaceId) || row.workspace !== undefined) throw new HttpError(403, "Changement d’entreprise interdit");
    return directModels.has(model) ? { ...row, workspaceId } : row;
  };
  if (operation === "create" || operation === "createMany" || operation === "createManyAndReturn") scoped.data = Array.isArray(args.data) ? args.data.map(data) : data(args.data);
  else {
    const where = (args.where ?? {}) as Record<string, unknown>;
    const scope = directModels.has(model) ? { workspaceId } : { [parentModels[model]]: { workspaceId } };
    scoped.where = { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), scope] };
    if (operation === "upsert") { scoped.create = data(args.create); scoped.update = directModels.has(model) ? data(args.update) : args.update; }
    if (args.data && directModels.has(model)) data(args.data);
  }
  return scoped;
}
export function workspaceDb(user: Pick<User, "workspaceId">) {
  if (!user.workspaceId) throw new HttpError(403, "Aucun espace de travail attribué");
  const workspaceId = user.workspaceId;
  return prisma.$extends({ query: { $allModels: { $allOperations({ model, operation, args, query }) {
    return query(scopedArgs(model, operation, args as unknown as Record<string, unknown>, workspaceId) as typeof args);
  } } } }) as unknown as typeof prisma;
}
export async function validateReferences(db: typeof prisma, references: { supplierId?: number | null; sectorIds?: number[]; pieceIds?: number[] }) {
  if (references.supplierId && !await db.supplier.findUnique({ where: { id: references.supplierId }, select: { id: true } })) throw new HttpError(400, "Fournisseur introuvable dans cette entreprise");
  if (references.sectorIds && await db.sector.count({ where: { id: { in: [...new Set(references.sectorIds)] } } }) !== new Set(references.sectorIds).size) throw new HttpError(400, "Secteur introuvable dans cette entreprise");
  if (references.pieceIds && await db.piece.count({ where: { id: { in: [...new Set(references.pieceIds)] } } }) !== new Set(references.pieceIds).size) throw new HttpError(400, "Pièce introuvable dans cette entreprise");
}
