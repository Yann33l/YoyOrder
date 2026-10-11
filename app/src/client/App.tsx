import { useEffect, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { currentVersion } from "./versions";
import { routes } from "wasp/client/router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import { NavBar } from "./components/NavBar/NavBar";
import {
  demoNavigationitems,
  marketingNavigationItems,
} from "./components/NavBar/constants";
import { CookieConsentBanner } from "./components/cookie-consent/Banner";

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export function App() {
  const location = useLocation();
  const isMarketingPage = useMemo(() => {
    return (
      location.pathname === routes.LandingPageRoute.to ||
      location.pathname === routes.PricingPageRoute.to
    );
  }, [location]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    return (
      location.pathname !== routes.LoginRoute.build() &&
      location.pathname !== routes.SignupRoute.build()
    );
  }, [location]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith(routes.AdminRoute.to);
  }, [location]);

  useEffect(() => {
    document.body.classList.remove("dark");
    document.documentElement.classList.remove("dark");
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  return (
    <>
      <div className="bg-background text-foreground min-h-screen">
        {isAdminDashboard ? (
          <Outlet />
        ) : (
          <>
            {shouldDisplayAppNavBar && (
              <NavBar navigationItems={navigationItems} />
            )}
            <div className={isMarketingPage ? "max-w-(--breakpoint-2xl) mx-auto" : "w-full min-w-0"}>
              <Outlet />
            </div>
          </>
        )}
        <footer className="text-muted-foreground px-3 py-3 text-right text-xs"><Link to="/versions" className="hover:text-foreground underline underline-offset-4" aria-label={`Historique des versions, version ${currentVersion}`}>Version {currentVersion}</Link></footer>
      </div>
      <Toaster position="bottom-right" />
      <CookieConsentBanner />
    </>
  );
}
