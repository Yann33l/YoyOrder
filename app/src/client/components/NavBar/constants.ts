import { routes } from "wasp/client/router";
import { BlogUrl, DocsUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";

const staticNavigationItems: NavigationItem[] = [
  { name: "Documentation", to: DocsUrl },
  { name: "Blog", to: BlogUrl },
];

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Connexion", to: routes.LoginRoute.to },
  { name: "Inscription", to: routes.SignupRoute.to },
] as const;

export const demoNavigationitems: NavigationItem[] = [
  { name: "Stocks et commandes", to: "/inventory" },
  { name: "Compte", to: routes.AccountRoute.to },
  ...staticNavigationItems,
] as const;
