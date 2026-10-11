import { useState } from "react";
import { useLocation } from "react-router";
import type { User } from "wasp/entities";
import { getSaasAdministration, saveSaasPlan, createCompanyWorkspace, updateCompanyWorkspace, switchCompanyWorkspace, useAction, useQuery } from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "../client/components/ui/dialog";
import { InventoryGrid } from "../inventory/InventoryGrid";
import { toast } from "../client/hooks/use-toast";
type Data = Awaited<ReturnType<typeof getSaasAdministration>>;
type Edit = { kind: "plan"; value?: Data["plans"][number] } | { kind: "workspace"; value?: Data["workspaces"][number] };
export function SaasPage({ user }: { user: User }) {
  const path = useLocation().pathname;
  const { data, error, refetch } = useQuery(getSaasAdministration, {}, { enabled: user.isSuperAdmin });
  const savePlan = useAction(saveSaasPlan), createSpace = useAction(createCompanyWorkspace), updateSpace = useAction(updateCompanyWorkspace), switchSpace = useAction(switchCompanyWorkspace);
  const [edit, setEdit] = useState<Edit | null>(null), [busy, setBusy] = useState(false), [link, setLink] = useState("");
  if (!user.isSuperAdmin) return <main className="p-8">Cet espace est réservé au super administrateur SaaS.</main>;
  const spaces = path.endsWith("workspaces");
  async function run(fn: () => Promise<unknown>) { setBusy(true); try { await fn(); await refetch(); return true; } catch (error) { toast({ title: "Enregistrement impossible", description: error instanceof Error ? error.message : "Réessayez", variant: "destructive" }); return false; } finally { setBusy(false); } }
  return <main className="yoyorder-workspace w-full min-w-0 space-y-5 px-2 py-5 sm:px-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-muted-foreground text-sm">Administration SaaS</p><h1 className="text-2xl font-semibold">{spaces ? "Espaces de travail" : "Plans et tarifs"}</h1></div><a className="underline" href="/inventory">Retour à l’entreprise</a></div>
    <nav className="flex gap-5 border-b pb-3"><a className={!spaces ? "font-semibold" : ""} href="/admin/plans">Plans</a><a className={spaces ? "font-semibold" : ""} href="/admin/workspaces">Espaces de travail</a><a href="/admin/tickets">Tickets</a></nav>
    <div className="flex justify-between gap-4"><p className="text-muted-foreground text-sm">{spaces ? "Chaque entreprise dispose de ses propres utilisateurs, rôles et données." : "Seuls les plans publiés sont proposés sur la page Tarifs. Les articles sont sans quota."}</p><Button onClick={() => setEdit({ kind: spaces ? "workspace" : "plan" })}>Créer {spaces ? "un espace" : "un plan"}</Button></div>
    {link && <div className="rounded border p-4"><p>Lien de confirmation du nouvel administrateur, à lui transmettre :</p><Input value={link} readOnly aria-label="Lien de confirmation" /><Button variant="ghost" onClick={() => setLink("")}>Masquer</Button></div>}
    {error ? <p className="text-destructive">{error.message}</p> : !data ? <p>Chargement…</p> : spaces ? <InventoryGrid rows={data.workspaces} rowId={(row) => row.id} label="Espaces de travail" columns={[
      { id: "name", label: "Entreprise", width: 240, value: (row) => row.name },
      { id: "plan", label: "Plan", value: (row) => data.plans.find((plan) => plan.id === row.planId)?.name ?? "Accès interne" },
      { id: "users", label: "Utilisateurs actifs", value: (row) => row.usersCount },
      { id: "storage", label: "Stockage utilisé (Mo)", value: (row) => Math.round(row.storageBytes / 1024 / 1024 * 100) / 100 },
      { id: "status", label: "État", value: (row) => row.enabled ? "Actif" : "Suspendu" },
      { id: "billing", label: "Abonnement", value: (row) => row.subscriptionStatus ?? "Interne" },
      { id: "actions", label: "Actions", width: 260, value: () => "", render: (row) => <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEdit({ kind: "workspace", value: row })}>Modifier</Button><Button variant="outline" size="sm" disabled={busy || !row.enabled || user.workspaceId === row.id} onClick={() => void run(async () => { await switchSpace({ workspaceId: row.id }); window.location.assign("/inventory"); })}>{user.workspaceId === row.id ? "Espace courant" : "Ouvrir"}</Button></div> },
    ]} /> : <InventoryGrid rows={data.plans} rowId={(row) => row.id} label="Plans" columns={[
      { id: "name", label: "Plan", width: 220, value: (row) => row.name },
      { id: "price", label: "€/mois", value: (row) => row.monthlyPriceCents / 100 },
      { id: "users", label: "Utilisateurs actifs max.", value: (row) => row.maxUsers ?? "Illimité" },
      { id: "storage", label: "Stockage (Mo)", value: (row) => row.storageMb },
      { id: "published", label: "Publié", value: (row) => row.published ? "Oui" : "Non" },
      { id: "order", label: "Ordre", value: (row) => row.displayOrder },
      { id: "stripe", label: "Tarif Stripe", width: 240, value: (row) => row.stripePriceId },
      { id: "edit", label: "Actions", value: () => "", render: (row) => <Button size="sm" variant="outline" onClick={() => setEdit({ kind: "plan", value: row })}>Modifier</Button> },
    ]} />}
    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open) setEdit(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogTitle>{edit?.value ? "Modifier" : "Créer"} {edit?.kind === "plan" ? "un plan" : "un espace"}</DialogTitle>{edit && <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const text = (name: string) => String(form.get(name) ?? ""); const number = (name: string) => Number(text(name));
      const saved = await run(async () => {
        if (edit.kind === "plan") await savePlan({ id: edit.value?.id, name: text("name"), description: text("description"), monthlyPriceCents: Math.round(number("price") * 100), stripePriceId: text("stripePriceId") || null, maxUsers: text("maxUsers") ? number("maxUsers") : null, storageMb: number("storageMb"), displayOrder: number("displayOrder"), published: form.has("published"), featured: form.has("featured"), features: text("features").split("\n").map((line) => line.trim()).filter(Boolean) });
        else if (edit.value) await updateSpace({ id: edit.value.id, name: text("name"), planId: text("planId") || null, enabled: form.has("enabled") });
        else { const created = await createSpace({ name: text("name"), planId: text("planId") || null, adminEmail: text("adminEmail"), adminPassword: text("adminPassword") }); setLink(created.verificationLink); }
      }); if (saved) setEdit(null);
    }}>
      <label className="block">Nom<Input name="name" defaultValue={edit.value?.name} required maxLength={120} /></label>
      {edit.kind === "plan" ? <>
        <label className="block">Description<Input name="description" defaultValue={edit.value?.description} /></label>
        <label className="block">Prix mensuel (€)<Input name="price" type="number" min={0} step="0.01" defaultValue={(edit.value?.monthlyPriceCents ?? 0) / 100} readOnly={Boolean(edit.value?.stripePriceId)} required /></label>
        <label className="block">Identifiant du tarif Stripe<Input name="stripePriceId" placeholder="price_… (vide pour une offre gratuite)" defaultValue={edit.value?.stripePriceId ?? ""} readOnly={Boolean(edit.value?.stripePriceId)} /></label>
        <label className="block">Utilisateurs actifs maximum (vide = illimité)<Input name="maxUsers" type="number" min={1} step={1} defaultValue={edit.value?.maxUsers ?? ""} /></label>
        <label className="block">Stockage des certificats (Mo)<Input name="storageMb" type="number" min={1} step={1} defaultValue={edit.value?.storageMb ?? 250} required /></label>
        <label className="block">Ordre d’affichage<Input name="displayOrder" type="number" min={0} step={1} defaultValue={edit.value?.displayOrder ?? 0} required /></label>
        <label className="block">Fonctionnalités affichées (une par ligne)<textarea className="bg-background mt-1 w-full rounded border p-2" name="features" rows={4} defaultValue={edit.value?.features.join("\n")} /></label>
        <label className="flex gap-2"><input type="checkbox" name="published" defaultChecked={edit.value?.published} />Publié sur la page Tarifs</label><label className="flex gap-2"><input type="checkbox" name="featured" defaultChecked={edit.value?.featured} />Mis en avant</label>
      </> : <>
        <label className="block">Plan<select className="bg-background mt-1 w-full rounded border p-2" name="planId" defaultValue={edit.value?.planId ?? ""}><option value="">Accès interne sans quota</option>{data?.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
        {edit.value ? <label className="flex gap-2"><input type="checkbox" name="enabled" defaultChecked={edit.value.enabled} />Espace activé</label> : <><label className="block">Email de l’administrateur de l’entreprise<Input name="adminEmail" type="email" required /></label><label className="block">Mot de passe initial<Input name="adminPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label></>}
      </>}<Button disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>}</DialogContent></Dialog>
  </main>;
}
