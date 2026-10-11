import { type GetInventoryOverview } from "wasp/server/operations";
import { requireActiveUser, accessSectorIds, pieceScope, orderScope } from "./access";
import { workspaceDb } from "./workspace";


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
  const user = await requireActiveUser(context);
  const db = workspaceDb(user);
  const sectorIds = await accessSectorIds(user);
  const stockWhere = sectorIds === null ? undefined : {
    receptions: {
      some: {
        reception: { order: orderScope(user, sectorIds) },
      },
    },
  };
  const articleWhere = sectorIds === null ? undefined : {
    sectors: { some: { sectorId: { in: sectorIds } } },
    ...pieceScope(user),
  };
  const [articleCount, stockCount, lowStockCount, pendingUsers] = await Promise.all([
    db.article.count({ where: articleWhere }),
    db.stock.count({ where: stockWhere }),
    db.stock.count({ where: { ...stockWhere, remainingQty: { lte: 2 } } }),
    user.isAdmin
      ? db.user.count({ where: { isAuthorized: false } })
      : Promise.resolve(0),
  ]);

  return { articleCount, stockCount, lowStockCount, pendingUsers };
};
