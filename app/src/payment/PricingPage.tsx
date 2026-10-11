import { useState } from "react";
import { useAuth } from "wasp/client/auth";
import { getPublicPlans, getWorkspaceBilling, createOwnWorkspace, startWorkspaceCheckout, openWorkspacePortal, useQuery, useAction } from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
export function PricingPage() {
  const { data: user } = useAuth();
  const { data: plans, error } = useQuery(getPublicPlans, {});
  const { data: billing } = useQuery(getWorkspaceBilling, {}, { enabled: Boolean(user?.workspaceId && (user?.isAdmin || user?.isSuperAdmin)) });
  const create = useAction(createOwnWorkspace), checkout = useAction(startWorkspaceCheckout), portal = useAction(openWorkspacePortal);
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function choose(planId: string) {
    if (!user) { window.location.assign("/signup"); return; }
    setBusy(true); setMessage("");
    try { if (!user.workspaceId) await create({ name, planId }); window.location.assign((await checkout({ planId })).url); } catch (error) { setMessage(error instanceof Error ? error.message : "Action impossible"); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-6xl space-y-8 px-6 py-12"><div className="text-center"><h1 className="text-3xl font-semibold">Un espace YoyOrder pour votre entreprise</h1><p className="text-muted-foreground mt-3">Des données séparées pour chaque entreprise. Des quotas uniquement sur les utilisateurs actifs et le stockage des certificats.</p></div>
    {billing && <section className="flex flex-wrap items-center justify-between gap-4 rounded border p-5"><div><h2 className="font-semibold">{billing.name} · {billing.plan?.name ?? "Accès interne"}</h2><p className="text-muted-foreground text-sm">Stockage : {(billing.storageBytes / 1024 / 1024).toFixed(2)} Mo{billing.plan ? ` / ${billing.plan.storageMb} Mo` : ""} · Abonnement : {billing.status ?? "interne"}</p></div>{billing.hasSubscription && <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { window.location.assign((await portal({})).url); } catch (error) { setMessage(error instanceof Error ? error.message : "Portail indisponible"); setBusy(false); } }}>Gérer l’abonnement</Button>}</section>}
    {user && !user.workspaceId && <label className="mx-auto block max-w-md">Nom de votre entreprise<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="Votre entreprise" /></label>}
    {(message || error) && <p role="alert" className="text-destructive text-center">{message || error?.message}</p>}
    {!plans ? <p className="text-center">Chargement des offres…</p> : !plans.length ? <p className="text-muted-foreground text-center">Les offres seront disponibles prochainement.</p> : <div className="grid items-stretch gap-6 md:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`flex flex-col rounded-xl border p-6 ${plan.featured ? "border-primary ring-primary ring-1" : ""}`}>{plan.featured && <p className="text-primary mb-3 text-sm font-medium">Recommandé</p>}<h2 className="text-xl font-semibold">{plan.name}</h2><p className="text-muted-foreground mt-2">{plan.description}</p><p className="my-6"><span className="text-3xl font-semibold">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(plan.monthlyPriceCents / 100)}</span><span className="text-muted-foreground"> / mois</span></p><ul className="mb-6 space-y-2 text-sm"><li>{plan.maxUsers === null ? "Utilisateurs actifs illimités" : `${plan.maxUsers} utilisateur${plan.maxUsers > 1 ? "s" : ""} actif${plan.maxUsers > 1 ? "s" : ""}`}</li><li>{plan.storageMb} Mo de stockage</li><li>Articles illimités</li>{plan.features.map((feature, index) => <li key={index}>{feature}</li>)}</ul><Button className="mt-auto" disabled={busy || Boolean(user && !user.workspaceId && !name.trim()) || Boolean(user?.workspaceId && !user.isAdmin && !user.isSuperAdmin) || Boolean(billing?.hasSubscription)} onClick={() => void choose(plan.id)}>{!user ? "Créer un compte" : billing?.plan?.id === plan.id ? "Plan actuel" : "Choisir ce plan"}</Button></article>)}</div>}
  </main>;
}
