import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "wasp/client/auth";
import { getMyAccess, useQuery } from "wasp/client/operations";
import { UserDropdown } from "../../user/UserDropdown";
import logo from "../static/brand/logo-yoyorder.png";
import { appSpace, spaceMenu, workView, type AppSpace } from "../navigation";
import "../navigation.css";

export function AppNavigation() {
  const { data: user } = useAuth();
  const { data: permissions } = useQuery(getMyAccess, {}, { enabled: Boolean(user) });
  const location = useLocation();
  if (!user) return null;
  const access = { isAuthorized: false, isAdmin: user.isAdmin || user.isSuperAdmin, isSuperAdmin: user.isSuperAdmin, isRequester: false, isBuyer: false, isEditor: false, ...permissions, canPublishNews: user.isAdmin };
  const space = appSpace(location.pathname, access);
  const view = workView(location.pathname, location.search);
  const spaces: { id: AppSpace; label: string; to: string; icon: typeof UserRound; visible: boolean }[] = [
    { id: "user", label: "Utilisateur", to: "/inventory", icon: UserRound, visible: true },
    { id: "company", label: "Administration", to: "/company/users", icon: Building2, visible: access.isAdmin },
    { id: "platform", label: "Super admin", to: "/admin/workspaces", icon: ShieldCheck, visible: access.isSuperAdmin },
  ];
  const visibleSpaces = spaces.filter((item) => item.visible);
  const menu = spaceMenu(space, access);
  const active = (entry: typeof menu[number]) => entry.view ? view === entry.view && (location.pathname.startsWith("/inventory") || location.pathname.startsWith("/company/")) : location.pathname === entry.to;
  return <header className={`app-navigation app-navigation-${space}`}>
    <div className="app-navigation-top">
      <Link to="/inventory" className="app-brand" aria-label="YoyOrder — accueil"><img src={logo} alt="YoyOrder" /></Link>
      {visibleSpaces.length > 1 && <nav className="app-space-switch" aria-label="Espaces de navigation">{visibleSpaces.map((item) => <Link key={item.id} to={item.to} aria-current={space === item.id ? "page" : undefined}><item.icon size={16} aria-hidden="true" /><span>{item.label}</span></Link>)}</nav>}
      <div className="app-navigation-account"><span className="app-workspace-name" title={permissions?.workspaceName ?? undefined}>{space === "platform" ? "Toutes les entreprises" : permissions?.workspaceName ?? "Mon entreprise"}</span><UserDropdown user={user} /></div>
    </div>
    <nav className="app-section-navigation" aria-label={space === "user" ? "Menu utilisateur" : space === "company" ? "Administration de l’entreprise" : "Super administration"}>{menu.map((entry) => <Link key={entry.to} to={entry.to} aria-current={active(entry) ? "page" : undefined}>{entry.label}</Link>)}</nav>
  </header>;
}
