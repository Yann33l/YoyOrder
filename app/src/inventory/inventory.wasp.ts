import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { InventoryPage } from "./InventoryPage" with { type: "ref" };
import {
  getInventoryOverview,
} from "./operations" with { type: "ref" };
import {
  createArticle,
  createPiece,
  createRequest,
  createSector,
  createSupplier,
  downloadCertificate,
  getCatalog,
  getOrders,
  getStock,
  getHistory,
  getWorkspaceUsers,
  registerReception,
  setOrderPurchase,
  setBatchOrderPurchase,
  updateStock,
  updateUserAccess,
  saveCatalogItem,
  setArticleComposition,
} from "./workflows" with { type: "ref" };

export const inventorySpec: Spec = [
  route("InventoryRoute", "/inventory", page(InventoryPage, { authRequired: true })),
  query(getInventoryOverview, { entities: ["Article", "Stock", "User", "UserSector"] }),
  query(getCatalog, { entities: ["Article", "ArticleSector", "ArticlePiece", "SubArticle", "ArticleSubArticle", "Supplier", "Sector", "Piece", "UserSector"] }),
  query(getWorkspaceUsers, { entities: ["User", "Sector", "UserSector"] }),
  query(getOrders, { entities: ["Order", "Article", "Sector", "OrderSector", "Reception", "UserSector"] }),
  query(getStock, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector"] }),
  query(getHistory, { entities: ["Order", "Article", "Supplier", "Sector", "OrderSector", "Reception", "Stock", "ReceptionStock", "SubOrder", "SubArticle", "User", "UserSector"] }),
  action(createRequest, { entities: ["Order", "Article", "Sector", "OrderSector", "User", "UserSector"] }),
  action(setOrderPurchase, { entities: ["Order", "OrderSector", "UserSector"] }),
  action(setBatchOrderPurchase, { entities: ["Order", "OrderSector", "Article", "UserSector"] }),
  action(registerReception, { entities: ["Reception", "Stock", "ReceptionStock", "Order", "OrderSector", "UserSector"] }),
  action(downloadCertificate, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector"] }),
  action(updateStock, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector"] }),
  action(createSupplier, { entities: ["Supplier"] }),
  action(createSector, { entities: ["Sector"] }),
  action(createPiece, { entities: ["Piece"] }),
  action(createArticle, { entities: ["Article", "Supplier", "Sector", "Piece", "ArticleSector", "ArticlePiece", "UserSector"] }),
  action(updateUserAccess, { entities: ["User", "Sector", "UserSector"] }),
  action(saveCatalogItem, { entities: ["Article", "ArticleSector", "ArticlePiece", "SubArticle", "Supplier", "Sector", "Piece", "UserSector"] }),
  action(setArticleComposition, { entities: ["Article", "SubArticle", "ArticleSubArticle", "UserSector"] }),
];
