import { LayoutDashboard, Settings, Shield } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  {
    name: "Stocks et commandes",
    to: routes.InventoryRoute.to,
    icon: LayoutDashboard,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: "Account Settings",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: "Administration SaaS",
    to: routes.SaasPlansRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
