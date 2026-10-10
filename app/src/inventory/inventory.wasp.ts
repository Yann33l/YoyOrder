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
  getWorkspaceUsers,
  registerReception,
  setOrderPurchase,
  updateStock,
  updateUserAccess,
} from "./workflows" with { type: "ref" };

export const inventorySpec: Spec = [
  route("InventoryRoute", "/inventory", page(InventoryPage, { authRequired: true })),
  query(getInventoryOverview, { entities: ["Article", "Stock", "User", "UserSector"] }),
  query(getCatalog, { entities: ["Article", "ArticleSector", "ArticlePiece", "Supplier", "Sector", "Piece", "UserSector"] }),
  query(getWorkspaceUsers, { entities: ["User", "Sector", "UserSector"] }),
  query(getOrders, { entities: ["Order", "Article", "Sector", "OrderSector", "UserSector"] }),
  query(getStock, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector"] }),
  action(createRequest, { entities: ["Order", "Article", "Sector", "OrderSector", "User", "UserSector"] }),
  action(setOrderPurchase, { entities: ["Order", "OrderSector", "UserSector"] }),
  action(registerReception, { entities: ["Reception", "Stock", "ReceptionStock", "Order", "OrderSector", "UserSector"] }),
  action(downloadCertificate, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector"] }),
  action(updateStock, { entities: ["Stock", "ReceptionStock", "Reception", "Order", "OrderSector", "UserSector"] }),
  action(createSupplier, { entities: ["Supplier"] }),
  action(createSector, { entities: ["Sector"] }),
  action(createPiece, { entities: ["Piece"] }),
  action(createArticle, { entities: ["Article", "Supplier", "Sector", "Piece", "ArticleSector", "ArticlePiece", "UserSector"] }),
  action(updateUserAccess, { entities: ["User", "Sector", "UserSector"] }),
];
