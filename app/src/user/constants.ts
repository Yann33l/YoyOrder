import { Settings } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  {
    name: "Mon compte",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
] as const;
