import { type Prisma } from "@prisma/client";
import type { Article, Order, Piece, Sector, Stock, Supplier, User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import {
  type CreateArticle,
  type CreatePiece,
  type CreateRequest,
  type CreateSector,
  type CreateSupplier,
  type DownloadCertificate,
  type GetCatalog,
  type GetOrders,
  type GetStock,
  type GetHistory,
  type RegisterReception,
  type SetOrderPurchase,
  type SetBatchOrderPurchase,
  type UpdateStock,
  type GetWorkspaceUsers,
  type UpdateUserAccess,
  type SaveCatalogItem,
  type SetArticleComposition,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { hasBusinessRole } from "./permissions";
import { workspaceDb, validateReferences } from "./workspace";
import { checkStorageQuota, withUserQuota } from "./quotas";
import { requireActiveUser, accessSectorIds, pieceScope, orderScope, assertArticleVisible, assertPieceSelection, type EffectiveUser } from "./access";

type CatalogArticle = Pick<Article, "id" | "label" | "reference" | "packaging" | "supplierId"> & {
  sectors: { sectorId: number }[];
  pieces: { pieceId: number }[];
};
type Catalog = {
  articles: CatalogArticle[];
  suppliers: Pick<Supplier, "id" | "label" | "telephone" | "email" | "website">[];
  sectors: Pick<Sector, "id" | "label">[];
  pieces: Pick<Piece, "id" | "label">[];
  subArticles: { id: number; label: string; reference: string | null; packaging: string | null }[];
  compositions: { articleId: number; subArticleId: number; quantity: number }[];
};

type OrderSummary = Pick<
  Order,
  "id" | "orderNumber" | "requestDate" | "orderDate" | "receivedInFull" | "comment" | "requesterComment"
> & {
  article: Pick<Article, "id" | "label" | "reference"> & { supplier: Pick<Supplier, "id" | "label"> | null };
  sectors: { quantity: number; sector: Pick<Sector, "id" | "label"> }[];
  quantityOrdered: number;
  receivedQty: number;
};

type StockSummary = Pick<Stock, "id" | "initialQty" | "remainingQty" | "lot" | "expiresAt"> & { hasCertificate: boolean };
type HistoryRow = {
  id: string; orderId: number; orderNumber: string | null; article: string; reference: string | null;
  packaging: string | null; supplier: string | null; sectors: string; requestedQty: number; requester: string | null;
  requestDate: Date | null; orderDate: Date | null; receivedInFull: boolean;
  requesterComment: string | null; orderComment: string | null; receptionId: number | null;
  receivedAt: Date | null; receivedQty: number | null; receptionComment: string | null;
  useStartedAt: Date | null; useEndedAt: Date | null; receptionRemainingQty: number | null;
  subArticle: string | null; stockId: number | null; lot: string | null; expiresAt: Date | null;
  initialQty: number | null; remainingQty: number | null; hasCertificate: boolean;
};

export const getHistory: GetHistory<Record<string, never>, HistoryRow[]> = async (_args, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer) throw new HttpError(403, "Aucun rôle ne permet de consulter l’historique");
  const sectorIds = await getSectorIds(user);
  const orders = await prisma.order.findMany({
    where: orderScope(user, sectorIds),
    select: {
      id: true, orderNumber: true, requestDate: true, orderDate: true, receivedInFull: true, requesterComment: true, comment: true,
      requestedBy: { select: { email: true } },
      article: { select: { label: true, reference: true, packaging: true, supplier: { select: { label: true } } } },
      sectors: { where: sectorIds === null ? undefined : { sectorId: { in: sectorIds } }, select: { quantity: true, sector: { select: { label: true } } } },
      receptions: { orderBy: { id: "asc" }, select: {
        id: true, quantity: true, receivedAt: true, comment: true, useStartedAt: true, useEndedAt: true, remainingQty: true,
        subOrder: { select: { subArticle: { select: { label: true } } } },
        stocks: { select: { stock: { select: { id: true, lot: true, expiresAt: true, initialQty: true, remainingQty: true, coa: true } } } },
      } },
    },
    orderBy: [{ requestDate: "desc" }, { id: "desc" }],
  });
  return orders.flatMap((order) => (order.receptions.length ? order.receptions : [null]).flatMap((reception) =>
    (reception?.stocks.length ? reception.stocks.map((link) => link.stock) : [null]).map((stock) => ({
      id: `${order.id}-${reception?.id ?? "none"}-${stock?.id ?? "none"}`, orderId: order.id, orderNumber: order.orderNumber,
      article: order.article.label, reference: order.article.reference, packaging: order.article.packaging, supplier: order.article.supplier?.label ?? null,
      sectors: order.sectors.map((entry) => `${entry.sector.label} : ${entry.quantity}`).join(" · "), requestedQty: order.sectors.reduce((sum, entry) => sum + entry.quantity, 0), requester: order.requestedBy?.email ?? null,
      requestDate: order.requestDate, orderDate: order.orderDate, receivedInFull: order.receivedInFull, requesterComment: order.requesterComment, orderComment: order.comment,
      receptionId: reception?.id ?? null, receivedAt: reception?.receivedAt ?? null, receivedQty: reception?.quantity ?? null, receptionComment: reception?.comment ?? null,
      useStartedAt: reception?.useStartedAt ?? null, useEndedAt: reception?.useEndedAt ?? null, receptionRemainingQty: reception?.remainingQty ?? null, subArticle: reception?.subOrder?.subArticle.label ?? null,
      stockId: stock?.id ?? null, lot: stock?.lot ?? null, expiresAt: stock?.expiresAt ?? null, initialQty: stock?.initialQty ?? null, remainingQty: stock?.remainingQty ?? null, hasCertificate: Boolean(stock?.coa),
    }))));
};
type WorkspaceUser = Pick<User, "id" | "email" | "isAuthorized" | "isRequester" | "isBuyer" | "isEditor"> & {
  sectors: { sectorId: number }[];
};

const requireUser = requireActiveUser;

function requireRole(user: User, role: "isRequester" | "isBuyer" | "isEditor") {
  if (!hasBusinessRole(user, role)) throw new HttpError(403, "Action non autorisée pour ce rôle");
}

const getSectorIds = accessSectorIds;

async function assertSectorAccess(user: EffectiveUser, sectorId: number) {
  const prisma = workspaceDb(user);
  if (user.isAdmin) return;
  if (user.roleSectorIds !== undefined) {
    if (!user.roleSectorIds.includes(sectorId)) throw new HttpError(403, "Ce secteur n’est pas autorisé par vos rôles");
    return;
  }
  const membership = await prisma.userSector.findUnique({
    where: { userId_sectorId: { userId: user.id, sectorId } },
    select: { sectorId: true },
  });
  if (!membership) throw new HttpError(403, "Vous n'êtes pas affecté à ce secteur");
}

export const getCatalog: GetCatalog<Record<string, never>, Catalog> = async (_args, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer && !user.isEditor) {
    throw new HttpError(403, "Aucun rôle ne permet de consulter les référentiels");
  }
  const sectorIds = await getSectorIds(user);
  const [articles, suppliers, sectors, pieces, subArticles, compositions] = await Promise.all([
    prisma.article.findMany({
      where: sectorIds === null ? undefined : { sectors: { some: { sectorId: { in: sectorIds } } }, ...pieceScope(user) },
      select: { id: true, label: true, reference: true, packaging: true, supplierId: true, sectors: { where: sectorIds === null ? undefined : { sectorId: { in: sectorIds } }, select: { sectorId: true } }, pieces: { where: user.isAdmin || user.rolePieceIds === undefined ? undefined : { pieceId: { in: user.rolePieceIds } }, select: { pieceId: true } } },
      orderBy: { label: "asc" },
    }),
    prisma.supplier.findMany({ where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }, select: { id: true, label: true, telephone: true, email: true, website: true }, orderBy: { label: "asc" } }),
    prisma.sector.findMany({
      where: sectorIds === null ? undefined : { id: { in: sectorIds } },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    prisma.piece.findMany({ where: sectorIds === null ? undefined : { ...(user.rolePieceIds === undefined ? {} : { id: { in: user.rolePieceIds } }), articles: { some: { article: { sectors: { some: { sectorId: { in: sectorIds } } } } } } }, select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.subArticle.findMany({ where: user.isEditor || sectorIds === null ? undefined : { compositions: { some: { article: { sectors: { some: { sectorId: { in: sectorIds } } }, ...pieceScope(user) } } } }, select: { id: true, label: true, reference: true, packaging: true }, orderBy: { label: "asc" } }),
    prisma.articleSubArticle.findMany({ where: sectorIds === null ? undefined : { article: { sectors: { some: { sectorId: { in: sectorIds } } }, ...pieceScope(user) } }, select: { articleId: true, subArticleId: true, quantity: true } }),
  ]);
  return { articles, suppliers, sectors, pieces, subArticles, compositions };
};

export const getWorkspaceUsers: GetWorkspaceUsers<Record<string, never>, WorkspaceUser[]> = async (_args, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  if (!user.isAdmin) throw new HttpError(403, "Réservé aux administrateurs");
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      isAuthorized: true,
      isRequester: true,
      isBuyer: true,
      isEditor: true,
      sectors: { select: { sectorId: true } },
    },
    orderBy: { email: "asc" },
  });
};

const userAccessSchema = z.object({
  userId: z.string().uuid(),
  isAuthorized: z.boolean(),
  isRequester: z.boolean(),
  isBuyer: z.boolean(),
  isEditor: z.boolean(),
  sectorIds: z.array(z.number().int().positive()),
});
type UserAccessInput = z.infer<typeof userAccessSchema>;

export const updateUserAccess: UpdateUserAccess<UserAccessInput, WorkspaceUser> = async (rawArgs, context) => {
  const actor = await requireUser(context);
  const prisma = workspaceDb(actor);
  if (!actor.isAdmin) throw new HttpError(403, "Réservé aux administrateurs");
  const input = ensureArgsSchemaOrThrowHttpError(userAccessSchema, rawArgs);
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new HttpError(404, "Compte introuvable");
  if (target.isSuperAdmin && !actor.isSuperAdmin) throw new HttpError(403, "Seul le super administrateur peut modifier ce compte");
  if (input.userId === actor.id && !input.isAuthorized) {
    throw new HttpError(400, "Vous ne pouvez pas désactiver votre propre compte administrateur");
  }
  if (input.isAuthorized && !input.isRequester && !input.isBuyer && !input.isEditor) {
    throw new HttpError(400, "Attribuez au moins un rôle à un compte actif");
  }
  const sectorCount = await prisma.sector.count({ where: { id: { in: input.sectorIds } } });
  if (sectorCount !== new Set(input.sectorIds).size) throw new HttpError(400, "Un secteur sélectionné est introuvable");

  const save = () => prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        isAuthorized: input.isAuthorized,
        isRequester: input.isRequester,
        isBuyer: input.isBuyer,
        isEditor: input.isEditor,
      },
    });
    await tx.userSector.deleteMany({ where: { userId: input.userId } });
    if (input.sectorIds.length) {
      await tx.userSector.createMany({
        data: [...new Set(input.sectorIds)].map((sectorId) => ({ userId: input.userId, sectorId })),
      });
    }
    return tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        isAuthorized: true,
        isRequester: true,
        isBuyer: true,
        isEditor: true,
        sectors: { select: { sectorId: true } },
      },
    });
  });
  return input.isAuthorized && !target.isSuperAdmin ? withUserQuota(actor.workspaceId!, save, input.userId) : save();
};

export const getOrders: GetOrders<Record<string, never>, OrderSummary[]> = async (_args, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer) {
    throw new HttpError(403, "Aucun rôle ne permet de consulter les commandes");
  }
  const sectorIds = await getSectorIds(user);
  const orders = await prisma.order.findMany({
    where: orderScope(user, sectorIds),
    select: {
      id: true,
      orderNumber: true,
      requestDate: true,
      orderDate: true,
      receivedInFull: true,
      comment: true,
      requesterComment: true,
      article: { select: { id: true, label: true, reference: true, supplier: { select: { id: true, label: true } } } },
      sectors: { select: { quantity: true, sector: { select: { id: true, label: true } } } },
      receptions: { select: { quantity: true } },
    },
    orderBy: [{ orderDate: "desc" }, { requestDate: "desc" }],
  });
  return orders.map(({ receptions, sectors, ...order }) => ({
    ...order,
    quantityOrdered: sectors.reduce((sum, entry) => sum + entry.quantity, 0),
    receivedQty: receptions.reduce((sum, entry) => sum + entry.quantity, 0),
    sectors: sectorIds === null ? sectors : sectors.filter((entry) => sectorIds.includes(entry.sector.id)),
  }));
};

const requestSchema = z.object({
  articleId: z.number().int().positive(),
  sectors: z.array(z.object({ sectorId: z.number().int().positive(), quantity: z.number().int().positive() })).min(1),
  requestDate: z.string().date(),
  comment: z.string().trim().max(255).optional(),
});
type RequestInput = z.infer<typeof requestSchema>;

export const createRequest: CreateRequest<RequestInput, Order> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isRequester");
  const input = ensureArgsSchemaOrThrowHttpError(requestSchema, rawArgs);
  await assertArticleVisible(user, input.articleId);
  if (new Set(input.sectors.map(({ sectorId }) => sectorId)).size !== input.sectors.length) throw new HttpError(400, "Un secteur ne peut apparaître qu'une seule fois");
  for (const { sectorId } of input.sectors) {
    await assertSectorAccess(user, sectorId);
    const articleSector = await prisma.articleSector.findUnique({
      where: { articleId_sectorId: { articleId: input.articleId, sectorId } },
      select: { articleId: true },
    });
    if (!articleSector) throw new HttpError(400, "Cet article n'est pas disponible pour ce secteur");
  }

  return prisma.order.create({
    data: {
      articleId: input.articleId,
      requestDate: new Date(`${input.requestDate}T00:00:00.000Z`),
      requesterComment: input.comment,
      requestedByUserId: user.id,
      sectors: { create: input.sectors },
    },
  });
};

const purchaseSchema = z.object({
  orderId: z.number().int().positive(),
  orderNumber: z.string().trim().max(255).optional(),
  orderDate: z.string().date(),
  comment: z.string().trim().max(255).optional(),
});
type PurchaseInput = z.infer<typeof purchaseSchema>;

export const setOrderPurchase: SetOrderPurchase<PurchaseInput, Order> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isBuyer");
  const input = ensureArgsSchemaOrThrowHttpError(purchaseSchema, rawArgs);
  const existing = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, articleId: true, requestDate: true, sectors: { select: { sectorId: true } } },
  });
  if (!existing) throw new HttpError(404, "Demande introuvable");
  await assertArticleVisible(user, existing.articleId);
  if (existing.requestDate && input.orderDate < existing.requestDate.toISOString().slice(0, 10)) {
    throw new HttpError(400, "La date de commande ne peut pas être antérieure à la date de demande");
  }
  if (!user.isAdmin) {
    const sectorIds = await getSectorIds(user);
    if (existing.sectors.some(({ sectorId }) => !sectorIds?.includes(sectorId))) {
      throw new HttpError(403, "Cette demande appartient à un autre secteur");
    }
  }
  return prisma.order.update({
    where: { id: input.orderId },
    data: {
      orderNumber: input.orderNumber || null,
      orderDate: new Date(`${input.orderDate}T00:00:00.000Z`),
      comment: input.comment,
    },
  });
};

const batchPurchaseSchema = purchaseSchema.omit({ orderId: true }).extend({ orderIds: z.array(z.number().int().positive()).min(1).max(500) });
type BatchPurchaseInput = z.infer<typeof batchPurchaseSchema>;
export const setBatchOrderPurchase: SetBatchOrderPurchase<BatchPurchaseInput, { count: number }> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isBuyer");
  const input = ensureArgsSchemaOrThrowHttpError(batchPurchaseSchema, rawArgs);
  const ids = [...new Set(input.orderIds)];
  const sectorIds = await getSectorIds(user);
  return prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({ where: { id: { in: ids }, ...orderScope(user, sectorIds) }, select: { id: true, orderDate: true, requestDate: true, article: { select: { supplierId: true } }, sectors: { select: { sectorId: true } } } });
    if (orders.length !== ids.length) throw new HttpError(404, "Une demande sélectionnée est introuvable");
    if (orders.some((order) => order.orderDate)) throw new HttpError(409, "Une demande a déjà été commandée. Actualisez la liste.");
    if (sectorIds !== null && orders.some((order) => order.sectors.some(({ sectorId }) => !sectorIds.includes(sectorId)))) throw new HttpError(403, "Une demande appartient à un secteur non autorisé");
    if (new Set(orders.map((order) => order.article.supplierId)).size > 1) throw new HttpError(400, "Sélectionnez des articles du même fournisseur pour une commande commune");
    if (orders.some((order) => order.requestDate && input.orderDate < order.requestDate.toISOString().slice(0, 10))) throw new HttpError(400, "La date de commande ne peut pas être antérieure à une date de demande sélectionnée");
    const result = await tx.order.updateMany({ where: { id: { in: ids }, orderDate: null }, data: { orderNumber: input.orderNumber || null, orderDate: new Date(`${input.orderDate}T00:00:00.000Z`), comment: input.comment ?? null } });
    if (result.count !== ids.length) throw new HttpError(409, "La sélection a été modifiée pendant l’enregistrement. Actualisez la liste.");
    return result;
  });
};

const receptionSchema = z.object({
  orderId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  receivedAt: z.string().date(),
  lot: z.string().trim().min(1).max(255),
  expiresAt: z.string().date().optional(),
  comment: z.string().trim().max(255).optional(),
  coaBase64: z.string().max(16 * 1024 * 1024).optional(),
});
type ReceptionInput = z.infer<typeof receptionSchema>;

export const registerReception: RegisterReception<ReceptionInput, StockSummary> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isRequester");
  const input = ensureArgsSchemaOrThrowHttpError(receptionSchema, rawArgs);
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderDate: true,
      articleId: true,
      receivedInFull: true,
      sectors: { select: { sectorId: true, quantity: true } },
    },
  });
  if (!order) throw new HttpError(404, "Commande introuvable");
  await assertArticleVisible(user, order.articleId);
  if (!order.orderDate) throw new HttpError(400, "La commande fournisseur doit être enregistrée avant sa réception");
  if (new Date(`${input.receivedAt}T00:00:00.000Z`) < order.orderDate) throw new HttpError(400, "La date de réception ne peut pas être antérieure à la date de commande");
  if (input.expiresAt && input.expiresAt < input.receivedAt) throw new HttpError(400, "La date de péremption ne peut pas être antérieure à la réception");
  if (order.receivedInFull) throw new HttpError(400, "Cette commande a déjà été reçue en totalité");
  if (!user.isAdmin) {
    const sectorIds = await getSectorIds(user);
    if (order.sectors.every(({ sectorId }) => !sectorIds?.includes(sectorId))) {
      throw new HttpError(403, "Cette commande appartient à un autre secteur");
    }
  }

  const quantityOrdered = order.sectors.reduce((total, item) => total + item.quantity, 0);
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const coa = input.coaBase64 ? Buffer.from(input.coaBase64, "base64") : null;
    await checkStorageQuota(tx, user, coa?.byteLength ?? 0);
    const alreadyReceived = await tx.reception.aggregate({
      where: { orderId: order.id },
      _sum: { quantity: true },
    });
    const newReceivedTotal = (alreadyReceived._sum.quantity ?? 0) + input.quantity;
    if (newReceivedTotal > quantityOrdered) {
      throw new HttpError(400, "La quantité reçue dépasse la quantité demandée");
    }
    const reception = await tx.reception.create({
      data: {
        orderId: order.id,
        quantity: input.quantity,
        remainingQty: input.quantity,
        receivedAt: new Date(`${input.receivedAt}T00:00:00.000Z`),
        comment: input.comment,
      },
    });
    const stock = await tx.stock.create({
      data: {
        initialQty: input.quantity,
        remainingQty: input.quantity,
        lot: input.lot,
        expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T00:00:00.000Z`) : null,
        coa,
        coaBytes: coa?.byteLength ?? 0,
        receptions: { create: { receptionId: reception.id } },
      },
      select: { id: true, initialQty: true, remainingQty: true, lot: true, expiresAt: true },
    });
    if (newReceivedTotal >= quantityOrdered) {
      await tx.order.update({ where: { id: order.id }, data: { receivedInFull: true } });
    }
    return { ...stock, hasCertificate: Boolean(input.coaBase64) };
  });
};

const certificateSchema = z.object({ stockId: z.number().int().positive() });
type CertificateInput = z.infer<typeof certificateSchema>;

export const downloadCertificate: DownloadCertificate<
  CertificateInput,
  { filename: string; base64: string } | null
> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer) throw new HttpError(403, "Aucun rôle ne permet de consulter les certificats");
  const { stockId } = ensureArgsSchemaOrThrowHttpError(certificateSchema, rawArgs);
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    select: {
      lot: true,
      coa: true,
      receptions: {
        select: {
          reception: {
            select: { order: { select: { sectors: { select: { sectorId: true } }, article: { select: { pieces: { select: { pieceId: true } } } } } } },
          },
        },
      },
    },
  });
  if (!stock) throw new HttpError(404, "Lot introuvable");
  if (!user.isAdmin) {
    const sectorIds = await getSectorIds(user);
    const canAccess = stock.receptions.some(({ reception }) =>
      reception.order.sectors.some(({ sectorId }) => sectorIds?.includes(sectorId)) && (user.rolePieceIds === undefined || reception.order.article.pieces.some(({ pieceId }) => user.rolePieceIds!.includes(pieceId))),
    );
    if (!canAccess) throw new HttpError(403, "Ce lot appartient à un autre secteur");
  }
  if (!stock.coa) return null;
  const safeLot = (stock.lot || `stock-${stockId}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  return { filename: `certificat-${safeLot}.pdf`, base64: Buffer.from(stock.coa).toString("base64") };
};

export const getStock: GetStock<Record<string, never>, StockSummary[]> = async (_args, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer) {
    throw new HttpError(403, "Aucun rôle ne permet de consulter les stocks");
  }
  const sectorIds = await getSectorIds(user);
  const rows = await prisma.stock.findMany({
    where: sectorIds === null
      ? undefined
      : {
          receptions: {
            some: {
              reception: {
                order: orderScope(user, sectorIds),
              },
            },
          },
        },
    select: { id: true, initialQty: true, remainingQty: true, lot: true, expiresAt: true, coa: true },
    orderBy: [{ expiresAt: "asc" }, { lot: "asc" }],
  });
  return rows.map(({ coa, ...stock }) => ({ ...stock, hasCertificate: Boolean(coa) }));
};

const stockUpdateSchema = z.object({
  stockId: z.number().int().positive(),
  remainingQty: z.number().int().nonnegative(),
});
type StockUpdateInput = z.infer<typeof stockUpdateSchema>;

export const updateStock: UpdateStock<StockUpdateInput, StockSummary> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isRequester");
  const { stockId, remainingQty } = ensureArgsSchemaOrThrowHttpError(stockUpdateSchema, rawArgs);
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    select: {
      initialQty: true,
      coa: true,
      receptions: {
        select: {
          reception: {
            select: { order: { select: { sectors: { select: { sectorId: true } }, article: { select: { pieces: { select: { pieceId: true } } } } } } },
          },
        },
      },
    },
  });
  if (!stock) throw new HttpError(404, "Lot introuvable");
  if (stock.initialQty !== null && remainingQty > stock.initialQty) {
    throw new HttpError(400, "La quantité restante dépasse la quantité reçue");
  }
  if (!user.isAdmin) {
    const sectorIds = await getSectorIds(user);
    const canAccess = stock.receptions.some(({ reception }) =>
      reception.order.sectors.some(({ sectorId }) => sectorIds?.includes(sectorId)) && (user.rolePieceIds === undefined || reception.order.article.pieces.some(({ pieceId }) => user.rolePieceIds!.includes(pieceId))),
    );
    if (!canAccess) throw new HttpError(403, "Ce lot appartient à un autre secteur");
  }
  return prisma.stock.update({
    where: { id: stockId },
    data: { remainingQty },
    select: { id: true, initialQty: true, remainingQty: true, lot: true, expiresAt: true },
  }).then((updated) => ({ ...updated, hasCertificate: Boolean(stock.coa) }));
};

const supplierSchema = z.object({ label: z.string().trim().min(1).max(255) });
type SupplierInput = z.infer<typeof supplierSchema>;

export const createSupplier: CreateSupplier<SupplierInput, Supplier> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isEditor");
  const { label } = ensureArgsSchemaOrThrowHttpError(supplierSchema, rawArgs);
  return prisma.supplier.create({ data: { label } });
};

export const createSector: CreateSector<SupplierInput, Sector> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isEditor");
  const { label } = ensureArgsSchemaOrThrowHttpError(supplierSchema, rawArgs);
  return prisma.sector.create({ data: { label } });
};

export const createPiece: CreatePiece<SupplierInput, Piece> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isEditor");
  const { label } = ensureArgsSchemaOrThrowHttpError(supplierSchema, rawArgs);
  return prisma.piece.create({ data: { label } });
};

const articleSchema = z.object({
  label: z.string().trim().min(1).max(255),
  reference: z.string().trim().max(255).optional(),
  packaging: z.string().trim().max(255).optional(),
  supplierId: z.number().int().positive().optional(),
  sectorIds: z.array(z.number().int().positive()).min(1, "Sélectionnez au moins un secteur compatible"),
  pieceIds: z.array(z.number().int().positive()),
});
type ArticleInput = z.infer<typeof articleSchema>;

async function assertArticleEditAccess(user: EffectiveUser, articleId: number) {
  const prisma = workspaceDb(user);
  await assertArticleVisible(user, articleId);
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { sectors: { select: { sectorId: true } }, pieces: { select: { pieceId: true } } } });
  if (!article) throw new HttpError(404, "Article introuvable");
  if (!user.isAdmin) {
    const allowed = await getSectorIds(user);
    if (!article.sectors.length || article.sectors.some(({ sectorId }) => !allowed?.includes(sectorId))) throw new HttpError(403, "Cet article appartient à un secteur non autorisé");
    if (user.rolePieceIds !== undefined && article.pieces.some(({ pieceId }) => !user.rolePieceIds!.includes(pieceId))) throw new HttpError(403, "Cet article est partagé avec une pièce non autorisée ; un administrateur doit le modifier");
  }
}

const catalogItemSchema = z.object({
  kind: z.enum(["supplier", "sector", "piece", "article", "subArticle"]),
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(1).max(255),
  reference: z.string().trim().max(255).optional(), packaging: z.string().trim().max(255).optional(),
  telephone: z.string().trim().max(255).optional(), email: z.union([z.literal(""), z.email()]).optional(), website: z.union([z.literal(""), z.url()]).optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  sectorIds: z.array(z.number().int().positive()).optional(), pieceIds: z.array(z.number().int().positive()).optional(),
});
export const saveCatalogItem: SaveCatalogItem<z.infer<typeof catalogItemSchema>, { id: number }> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user); requireRole(user, "isEditor");
  const input = ensureArgsSchemaOrThrowHttpError(catalogItemSchema, rawArgs);
  const { kind, id, label } = input;
  if (kind === "article") {
    await validateReferences(prisma, input);
    assertPieceSelection(user, input.pieceIds ?? []);
    if (id) await assertArticleEditAccess(user, id);
    if (!input.sectorIds?.length) throw new HttpError(400, "Sélectionnez au moins un secteur compatible");
    for (const sectorId of input.sectorIds) await assertSectorAccess(user, sectorId);
    return prisma.$transaction(async (tx) => {
      const data = { label, reference: input.reference || null, packaging: input.packaging || null, supplierId: input.supplierId ?? null };
      const article = id ? await tx.article.update({ where: { id }, data }) : await tx.article.create({ data });
      await tx.articleSector.deleteMany({ where: { articleId: article.id } });
      await tx.articleSector.createMany({ data: [...new Set(input.sectorIds)].map((sectorId) => ({ articleId: article.id, sectorId })) });
      await tx.articlePiece.deleteMany({ where: { articleId: article.id } });
      if (input.pieceIds?.length) await tx.articlePiece.createMany({ data: [...new Set(input.pieceIds)].map((pieceId) => ({ articleId: article.id, pieceId })) });
      return { id: article.id };
    });
  }
  if (kind === "sector") {
    if (id) await assertSectorAccess(user, id);
    return id ? prisma.sector.update({ where: { id }, data: { label } }) : prisma.sector.create({ data: { label } });
  }
  if (kind === "piece") {
    if (id && !user.isAdmin && user.rolePieceIds !== undefined && !user.rolePieceIds.includes(id)) throw new HttpError(403, "Pièce non autorisée par vos rôles");
    if (id && !user.isAdmin) {
      const sectorIds = await getSectorIds(user);
      const allowed = await prisma.piece.findFirst({ where: { id, articles: { some: { article: { sectors: { some: { sectorId: { in: sectorIds ?? [] } } } } } } }, select: { id: true } });
      if (!allowed) throw new HttpError(403, "Pièce non autorisée");
    }
    return id ? prisma.piece.update({ where: { id }, data: { label } }) : prisma.piece.create({ data: { label } });
  }
  if (kind === "supplier") {
    const data = { label, telephone: input.telephone || null, email: input.email || null, website: input.website || null };
    return id ? prisma.supplier.update({ where: { id }, data }) : prisma.supplier.create({ data });
  }
  const data = { label, reference: input.reference || null, packaging: input.packaging || null };
  return id ? prisma.subArticle.update({ where: { id }, data }) : prisma.subArticle.create({ data });
};

const compositionSchema = z.object({ articleId: z.number().int().positive(), subArticleId: z.number().int().positive(), quantity: z.number().int().nonnegative() });
export const setArticleComposition: SetArticleComposition<z.infer<typeof compositionSchema>, { articleId: number }> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user); requireRole(user, "isEditor");
  const input = ensureArgsSchemaOrThrowHttpError(compositionSchema, rawArgs);
  await assertArticleEditAccess(user, input.articleId);
  if (!await prisma.subArticle.findUnique({ where: { id: input.subArticleId }, select: { id: true } })) throw new HttpError(404, "Sous-article introuvable");
  const key = { articleId: input.articleId, subArticleId: input.subArticleId };
  if (input.quantity === 0) await prisma.articleSubArticle.deleteMany({ where: key });
  else await prisma.articleSubArticle.upsert({ where: { articleId_subArticleId: key }, create: { ...key, quantity: input.quantity }, update: { quantity: input.quantity } });
  return { articleId: input.articleId };
};

export const createArticle: CreateArticle<ArticleInput, Article> = async (rawArgs, context) => {
  const user = await requireUser(context);
  const prisma = workspaceDb(user);
  requireRole(user, "isEditor");
  const input = ensureArgsSchemaOrThrowHttpError(articleSchema, rawArgs);
  await validateReferences(prisma, input);
  assertPieceSelection(user, input.pieceIds);
  for (const sectorId of input.sectorIds) await assertSectorAccess(user, sectorId);
  return prisma.article.create({
    data: {
      label: input.label,
      reference: input.reference,
      packaging: input.packaging,
      supplierId: input.supplierId,
      sectors: { create: [...new Set(input.sectorIds)].map((sectorId) => ({ sectorId })) },
      pieces: { create: [...new Set(input.pieceIds)].map((pieceId) => ({ pieceId })) },
    },
  });
};
