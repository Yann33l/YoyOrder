import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { InventoryPage } from "./InventoryPage" with { type: "ref" };
import { getMyAccess, getAccessAdministration, saveAccessRole, saveManagedUser, createManagedUser } from "./admin" with { type: "ref" };
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
  query(getMyAccess, { entities: ["User", "AccessRole"] }),
  query(getAccessAdministration, { entities: ["User", "AccessRole", "Sector", "Piece"] }),
  action(saveAccessRole, { entities: ["AccessRole", "Sector", "Piece", "User"] }),
  action(saveManagedUser, { entities: ["User", "AccessRole"] }),
  action(createManagedUser, { entities: ["User", "AccessRole"] }),
  query(getInventoryOverview, { entities: ["Article", "Stock", "User", "UserSector", "AccessRole"] }),
  query(getCatalog, { entities: ["Article", "ArticleSector", "ArticlePiece", "SubArticle", "ArticleSubArticle", "Supplier", "Sector", "Piece", "UserSector", "AccessRole", "User"] }),
  query(getWorkspaceUsers, { entities: ["User", "Sector", "UserSector", "AccessRole"] }),
  query(getOrders, { entities: ["Order", "Article", "Sector", "OrderSector", "Reception", "UserSector", "AccessRole", "User"] }),
  query(getStock, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector", "AccessRole", "User"] }),
  query(getHistory, { entities: ["Order", "Article", "Supplier", "Sector", "OrderSector", "Reception", "Stock", "ReceptionStock", "SubOrder", "SubArticle", "User", "UserSector", "AccessRole"] }),
  action(createRequest, { entities: ["Order", "Article", "Sector", "OrderSector", "User", "UserSector", "AccessRole"] }),
  action(setOrderPurchase, { entities: ["Order", "OrderSector", "UserSector", "AccessRole", "User"] }),
  action(setBatchOrderPurchase, { entities: ["Order", "OrderSector", "Article", "UserSector", "AccessRole", "User"] }),
  action(registerReception, { entities: ["Reception", "Stock", "ReceptionStock", "Order", "OrderSector", "UserSector", "AccessRole", "User"] }),
  action(downloadCertificate, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector", "AccessRole", "User"] }),
  action(updateStock, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector", "AccessRole", "User"] }),
  action(createSupplier, { entities: ["Supplier"] }),
  action(createSector, { entities: ["Sector"] }),
  action(createPiece, { entities: ["Piece"] }),
  action(createArticle, { entities: ["Article", "Supplier", "Sector", "Piece", "ArticleSector", "ArticlePiece", "UserSector", "AccessRole", "User"] }),
  action(updateUserAccess, { entities: ["User", "Sector", "UserSector", "AccessRole"] }),
  action(saveCatalogItem, { entities: ["Article", "ArticleSector", "ArticlePiece", "SubArticle", "Supplier", "Sector", "Piece", "UserSector", "AccessRole", "User"] }),
  action(setArticleComposition, { entities: ["Article", "SubArticle", "ArticleSubArticle", "UserSector", "AccessRole", "User"] }),
];
