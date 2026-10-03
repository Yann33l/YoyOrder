import { HttpError, prisma } from "wasp/server";
import { type GetInventoryOverview } from "wasp/server/operations";

async function getUserSectorIds(userId: string) {
  const memberships = await prisma.userSector.findMany({
    where: { userId },
    select: { sectorId: true },
  });
  return memberships.map(({ sectorId }) => sectorId);
}

type InventoryOverview = {
  articleCount: number;
  stockCount: number;
  lowStockCount: number;
  pendingUsers: number;
};

export const getInventoryOverview: GetInventoryOverview<
  Record<string, never>,
  InventoryOverview
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Authentification requise");
  }
  if (!context.user.isAuthorized) {
    throw new HttpError(403, "Votre compte attend l'activation d'un administrateur");
  }

  const user = context.user;
  const sectorIds = user.isAdmin ? null : await getUserSectorIds(user.id);
  const stockWhere = sectorIds === null ? undefined : {
    receptions: {
      some: {
        reception: { order: { sectors: { some: { sectorId: { in: sectorIds } } } } },
      },
    },
  };
  const articleWhere = sectorIds === null ? undefined : {
    sectors: { some: { sectorId: { in: sectorIds } } },
  };
  const [articleCount, stockCount, lowStockCount, pendingUsers] = await Promise.all([
    context.entities.Article.count({ where: articleWhere }),
    context.entities.Stock.count({ where: stockWhere }),
    context.entities.Stock.count({ where: { ...stockWhere, remainingQty: { lte: 2 } } }),
    context.user.isAdmin
      ? context.entities.User.count({ where: { isAuthorized: false } })
      : Promise.resolve(0),
  ]);

  return { articleCount, stockCount, lowStockCount, pendingUsers };
};
