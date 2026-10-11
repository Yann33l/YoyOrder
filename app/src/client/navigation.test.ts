import { describe, expect, it } from "vitest";
import { appSpace, canOpenView, spaceMenu, workView, type NavigationAccess } from "./navigation";

const member: NavigationAccess = { isAuthorized: true, isAdmin: false, isSuperAdmin: false, isRequester: true, isBuyer: false, isEditor: false, canPublishNews: false };
describe("Espaces de navigation et permissions", () => {
  it("ne mélange pas les actions métier et les accès d’administration pour un technicien", () => {
    expect(spaceMenu("user", member).map((item) => item.label)).toEqual(["Accueil", "Demandes", "Réceptions", "Stock", "Historique", "Assistance"]);
    expect(spaceMenu("company", member)).toEqual([]);
    expect(spaceMenu("platform", member)).toEqual([]);
    expect(canOpenView("users", member)).toBe(false);
    expect(canOpenView("orders", member)).toBe(false);
  });
  it("réserve les offres globales au super administrateur et la publication à l’admin d’entreprise", () => {
    const admin = { ...member, isAdmin: true, isEditor: true, canPublishNews: true };
    expect(spaceMenu("user", admin).some((item) => item.to.startsWith("/company/"))).toBe(false);
    expect(spaceMenu("company", admin).map((item) => item.label)).toContain("Actualités");
    expect(spaceMenu("platform", admin)).toEqual([]);
    const root = { ...admin, isSuperAdmin: true, canPublishNews: false };
    expect(spaceMenu("platform", root).map((item) => item.label)).toEqual(["Entreprises", "Plans et tarifs", "Tickets support"]);
    expect(spaceMenu("company", root).some((item) => item.view === "news")).toBe(false);
  });
  it("conserve les référentiels d’un éditeur sans lui ouvrir l’administration", () => {
    const editor = { ...member, isRequester: false, isEditor: true };
    expect(spaceMenu("user", editor).map((item) => item.label)).toEqual(["Accueil", "Référentiels", "Assistance"]);
    expect(spaceMenu("company", editor)).toEqual([]);
  });
  it("conserve la section dans l’URL et distingue les trois espaces", () => {
    expect(workView("/company/roles", "")).toBe("roles");
    expect(workView("/inventory", "?view=receptions")).toBe("receptions");
    expect(workView("/inventory", "?view=invalid")).toBe("overview");
    expect(appSpace("/tickets", member)).toBe("user");
    expect(appSpace("/company/users", member)).toBe("company");
    expect(appSpace("/admin/tickets", member)).toBe("platform");
  });
});
