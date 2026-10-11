export type WorkView = "overview" | "requests" | "orders" | "receptions" | "stock" | "history" | "catalog" | "users" | "roles" | "news";
export type NavigationAccess = { isAuthorized: boolean; isAdmin: boolean; isSuperAdmin: boolean; isRequester: boolean; isBuyer: boolean; isEditor: boolean; canPublishNews: boolean };
export type AppSpace = "user" | "company" | "platform";
export type MenuEntry = { label: string; to: string; view?: WorkView };
export const companyViews: Record<string, WorkView> = { "/company/users": "users", "/company/roles": "roles", "/company/catalog": "catalog", "/company/news": "news" };
export function workView(pathname: string, search: string): WorkView {
  if (companyViews[pathname]) return companyViews[pathname];
  const value = new URLSearchParams(search).get("view");
  const views: WorkView[] = ["overview", "requests", "orders", "receptions", "stock", "history", "catalog"];
  return views.includes(value as WorkView) ? value as WorkView : "overview";
}
export function canOpenView(view: WorkView, access: NavigationAccess) {
  if (!access.isAuthorized) return false;
  if (view === "users" || view === "roles") return access.isAdmin;
  if (view === "news") return access.isAdmin && access.canPublishNews;
  if (view === "requests" || view === "receptions" || view === "stock") return access.isRequester;
  if (view === "orders") return access.isBuyer;
  if (view === "catalog") return access.isEditor;
  if (view === "history") return access.isAdmin || access.isRequester || access.isBuyer;
  return true;
}
export function appSpace(pathname: string, access: NavigationAccess): AppSpace {
  if (pathname.startsWith("/admin")) return "platform";
  if (pathname.startsWith("/company/") || pathname === "/pricing" && access.isAdmin) return "company";
  return "user";
}
export function spaceMenu(space: AppSpace, access: NavigationAccess): MenuEntry[] {
  if (space === "platform") return access.isSuperAdmin ? [{ label: "Entreprises", to: "/admin/workspaces" }, { label: "Plans et tarifs", to: "/admin/plans" }, { label: "Tickets support", to: "/admin/tickets" }] : [];
  if (space === "company") return access.isAdmin ? [
    { label: "Utilisateurs", to: "/company/users", view: "users" },
    { label: "Rôles et accès", to: "/company/roles", view: "roles" },
    { label: "Référentiels", to: "/company/catalog", view: "catalog" },
    { label: "Actualités", to: "/company/news", view: "news" },
    { label: "Abonnement", to: "/pricing" },
  ].filter((item) => !item.view || canOpenView(item.view as WorkView, access)) as MenuEntry[] : [];
  const entries: MenuEntry[] = [
    { label: "Accueil", to: "/inventory", view: "overview" },
    { label: "Demandes", to: "/inventory?view=requests", view: "requests" },
    { label: "Commandes", to: "/inventory?view=orders", view: "orders" },
    { label: "Réceptions", to: "/inventory?view=receptions", view: "receptions" },
    { label: "Stock", to: "/inventory?view=stock", view: "stock" },
    { label: "Historique", to: "/inventory?view=history", view: "history" },
    ...(!access.isAdmin ? [{ label: "Référentiels", to: "/inventory?view=catalog", view: "catalog" as const }] : []),
    { label: "Assistance", to: "/tickets" },
  ];
  return entries.filter((item) => !item.view || item.view === "overview" || canOpenView(item.view, access));
}
