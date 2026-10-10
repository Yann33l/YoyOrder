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
  type RegisterReception,
  type SetOrderPurchase,
  type UpdateStock,
  type GetWorkspaceUsers,
  type UpdateUserAccess,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { hasBusinessRole } from "./permissions";

type CatalogArticle = Pick<Article, "id" | "label" | "reference" | "packaging" | "supplierId">;
type Catalog = {
  articles: CatalogArticle[];
  suppliers: Pick<Supplier, "id" | "label">[];
  sectors: Pick<Sector, "id" | "label">[];
  pieces: Pick<Piece, "id" | "label">[];
};

type OrderSummary = Pick<
  Order,
  "id" | "orderNumber" | "requestDate" | "orderDate" | "receivedInFull" | "comment" | "requesterComment"
> & {
  article: Pick<Article, "id" | "label" | "reference">;
  sectors: { quantity: number; sector: Pick<Sector, "id" | "label"> }[];
};

type StockSummary = Pick<Stock, "id" | "initialQty" | "remainingQty" | "lot" | "expiresAt"> & { hasCertificate: boolean };
type WorkspaceUser = Pick<User, "id" | "email" | "isAuthorized" | "isRequester" | "isBuyer" | "isEditor"> & {
  sectors: { sectorId: number }[];
};

async function requireUser(context: { user?: User | null }) {
  if (!context.user) throw new HttpError(401, "Authentification requise");
  if (!context.user.isAuthorized) throw new HttpError(403, "Compte en attente d'activation");
  return context.user;
}

function requireRole(user: User, role: "isRequester" | "isBuyer" | "isEditor") {
  if (!hasBusinessRole(user, role)) throw new HttpError(403, "Action non autorisée pour ce rôle");
}

async function getSectorIds(user: User) {
  if (user.isAdmin) return null;
  const memberships = await prisma.userSector.findMany({
    where: { userId: user.id },
    select: { sectorId: true },
  });
  return memberships.map(({ sectorId }) => sectorId);
}

async function assertSectorAccess(user: User, sectorId: number) {
  if (user.isAdmin) return;
  const membership = await prisma.userSector.findUnique({
    where: { userId_sectorId: { userId: user.id, sectorId } },
    select: { sectorId: true },
  });
  if (!membership) throw new HttpError(403, "Vous n'êtes pas affecté à ce secteur");
}

export const getCatalog: GetCatalog<Record<string, never>, Catalog> = async (_args, context) => {
  const user = await requireUser(context);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer && !user.isEditor) {
    throw new HttpError(403, "Aucun rôle ne permet de consulter les référentiels");
  }
  const [articles, suppliers, sectors, pieces] = await Promise.all([
    prisma.article.findMany({
      where: user.isAdmin ? undefined : { sectors: { some: { sectorId: { in: (await getSectorIds(user)) ?? [] } } } },
      select: { id: true, label: true, reference: true, packaging: true, supplierId: true },
      orderBy: { label: "asc" },
    }),
    prisma.supplier.findMany({ where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }, select: { id: true, label: true }, orderBy: { label: "asc" } }),
    prisma.sector.findMany({
      where: user.isAdmin ? undefined : { users: { some: { userId: user.id } } },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    prisma.piece.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
  ]);
  return { articles, suppliers, sectors, pieces };
};

export const getWorkspaceUsers: GetWorkspaceUsers<Record<string, never>, WorkspaceUser[]> = async (_args, context) => {
  const user = await requireUser(context);
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
  if (!actor.isAdmin) throw new HttpError(403, "Réservé aux administrateurs");
  const input = ensureArgsSchemaOrThrowHttpError(userAccessSchema, rawArgs);
  if (input.userId === actor.id && !input.isAuthorized) {
    throw new HttpError(400, "Vous ne pouvez pas désactiver votre propre compte administrateur");
  }
  if (input.isAuthorized && !input.isRequester && !input.isBuyer && !input.isEditor) {
    throw new HttpError(400, "Attribuez au moins un rôle à un compte actif");
  }
  const sectorCount = await prisma.sector.count({ where: { id: { in: input.sectorIds } } });
  if (sectorCount !== new Set(input.sectorIds).size) throw new HttpError(400, "Un secteur sélectionné est introuvable");

  return prisma.$transaction(async (tx) => {
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
};

export const getOrders: GetOrders<Record<string, never>, OrderSummary[]> = async (_args, context) => {
  const user = await requireUser(context);
  if (!user.isAdmin && !user.isRequester && !user.isBuyer) {
    throw new HttpError(403, "Aucun rôle ne permet de consulter les commandes");
  }
  const sectorIds = await getSectorIds(user);
  return prisma.order.findMany({
    where: sectorIds === null ? undefined : { sectors: { some: { sectorId: { in: sectorIds } } } },
    select: {
      id: true,
      orderNumber: true,
      requestDate: true,
      orderDate: true,
      receivedInFull: true,
      comment: true,
      requesterComment: true,
      article: { select: { id: true, label: true, reference: true } },
      sectors: { select: { quantity: true, sector: { select: { id: true, label: true } } } },
    },
    orderBy: [{ orderDate: "desc" }, { requestDate: "desc" }],
  });
};

const requestSchema = z.object({
  articleId: z.number().int().positive(),
  sectorId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  requestDate: z.string().date(),
  comment: z.string().trim().max(255).optional(),
});
type RequestInput = z.infer<typeof requestSchema>;

export const createRequest: CreateRequest<RequestInput, Order> = async (rawArgs, context) => {
  const user = await requireUser(context);
  requireRole(user, "isRequester");
  const input = ensureArgsSchemaOrThrowHttpError(requestSchema, rawArgs);
  await assertSectorAccess(user, input.sectorId);
  const articleSector = await prisma.articleSector.findUnique({
    where: { articleId_sectorId: { articleId: input.articleId, sectorId: input.sectorId } },
    select: { articleId: true },
  });
  if (!articleSector) throw new HttpError(400, "Cet article n'est pas disponible pour ce secteur");

  return prisma.order.create({
    data: {
      articleId: input.articleId,
      requestDate: new Date(`${input.requestDate}T00:00:00.000Z`),
      requesterComment: input.comment,
      requestedByUserId: user.id,
      sectors: { create: { sectorId: input.sectorId, quantity: input.quantity } },
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
  requireRole(user, "isBuyer");
  const input = ensureArgsSchemaOrThrowHttpError(purchaseSchema, rawArgs);
  const existing = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, sectors: { select: { sectorId: true } } },
  });
  if (!existing) throw new HttpError(404, "Demande introuvable");
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
  requireRole(user, "isRequester");
  const input = ensureArgsSchemaOrThrowHttpError(receptionSchema, rawArgs);
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderDate: true,
      receivedInFull: true,
      sectors: { select: { sectorId: true, quantity: true } },
    },
  });
  if (!order) throw new HttpError(404, "Commande introuvable");
  if (!order.orderDate) throw new HttpError(400, "La commande fournisseur doit être enregistrée avant sa réception");
  if (order.receivedInFull) throw new HttpError(400, "Cette commande a déjà été reçue en totalité");
  if (!user.isAdmin) {
    const sectorIds = await getSectorIds(user);
    if (order.sectors.every(({ sectorId }) => !sectorIds?.includes(sectorId))) {
      throw new HttpError(403, "Cette commande appartient à un autre secteur");
    }
  }

  const quantityOrdered = order.sectors.reduce((total, item) => total + item.quantity, 0);
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        coa: input.coaBase64 ? Buffer.from(input.coaBase64, "base64") : null,
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
  requireRole(user, "isRequester");
  const { stockId } = ensureArgsSchemaOrThrowHttpError(certificateSchema, rawArgs);
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    select: {
      lot: true,
      coa: true,
      receptions: {
        select: {
          reception: {
            select: { order: { select: { sectors: { select: { sectorId: true } } } } },
          },
        },
      },
    },
  });
  if (!stock) throw new HttpError(404, "Lot introuvable");
  if (!user.isAdmin) {
    const sectorIds = await getSectorIds(user);
    const canAccess = stock.receptions.some(({ reception }) =>
      reception.order.sectors.some(({ sectorId }) => sectorIds?.includes(sectorId)),
    );
    if (!canAccess) throw new HttpError(403, "Ce lot appartient à un autre secteur");
  }
  if (!stock.coa) return null;
  const safeLot = (stock.lot || `stock-${stockId}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  return { filename: `certificat-${safeLot}.pdf`, base64: Buffer.from(stock.coa).toString("base64") };
};

export const getStock: GetStock<Record<string, never>, StockSummary[]> = async (_args, context) => {
  const user = await requireUser(context);
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
                order: { sectors: { some: { sectorId: { in: sectorIds } } } },
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
            select: { order: { select: { sectors: { select: { sectorId: true } } } } },
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
      reception.order.sectors.some(({ sectorId }) => sectorIds?.includes(sectorId)),
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
  requireRole(user, "isEditor");
  const { label } = ensureArgsSchemaOrThrowHttpError(supplierSchema, rawArgs);
  return prisma.supplier.create({ data: { label } });
};

export const createSector: CreateSector<SupplierInput, Sector> = async (rawArgs, context) => {
  const user = await requireUser(context);
  requireRole(user, "isEditor");
  const { label } = ensureArgsSchemaOrThrowHttpError(supplierSchema, rawArgs);
  return prisma.sector.create({ data: { label } });
};

export const createPiece: CreatePiece<SupplierInput, Piece> = async (rawArgs, context) => {
  const user = await requireUser(context);
  requireRole(user, "isEditor");
  const { label } = ensureArgsSchemaOrThrowHttpError(supplierSchema, rawArgs);
  return prisma.piece.create({ data: { label } });
};

const articleSchema = z.object({
  label: z.string().trim().min(1).max(255),
  reference: z.string().trim().max(255).optional(),
  packaging: z.string().trim().max(255).optional(),
  supplierId: z.number().int().positive().optional(),
  sectorIds: z.array(z.number().int().positive()),
  pieceIds: z.array(z.number().int().positive()),
});
type ArticleInput = z.infer<typeof articleSchema>;

export const createArticle: CreateArticle<ArticleInput, Article> = async (rawArgs, context) => {
  const user = await requireUser(context);
  requireRole(user, "isEditor");
  const input = ensureArgsSchemaOrThrowHttpError(articleSchema, rawArgs);
  for (const sectorId of input.sectorIds) await assertSectorAccess(user, sectorId);
  return prisma.article.create({
    data: {
      label: input.label,
      reference: input.reference,
      packaging: input.packaging,
      supplierId: input.supplierId,
      sectors: { create: input.sectorIds.map((sectorId) => ({ sectorId })) },
      pieces: { create: input.pieceIds.map((pieceId) => ({ pieceId })) },
    },
  });
};
