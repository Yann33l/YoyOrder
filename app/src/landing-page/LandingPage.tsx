import { Link as WaspRouterLink, routes } from "wasp/client/router";
import logo from "../client/static/brand/logo-yoyorder.png";
import { Button } from "../client/components/ui/button";

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center px-6 py-12">
      <div className="max-w-2xl">
        <img className="mb-6 h-auto w-72 max-w-full object-contain" src={logo} alt="YoyOrder" />
        <h1 className="text-4xl font-semibold">YoyOrder</h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg leading-7">
          Demandes, commandes et suivi des stocks pour les laboratoires.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <WaspRouterLink to={routes.LoginRoute.to}>Se connecter</WaspRouterLink>
          </Button>
          <Button variant="outline" asChild>
            <WaspRouterLink to={routes.SignupRoute.to}>Créer un compte</WaspRouterLink>
          </Button>
        </div>
      </div>
    </main>
  );
}
