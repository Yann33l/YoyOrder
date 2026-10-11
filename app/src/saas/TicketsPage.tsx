import { useState, type FormEvent } from "react";
import { useQuery, useAction, getTickets, createTicket, replyTicket, updateTicket } from "wasp/client/operations";
import type { User } from "wasp/entities";
import { InventoryGrid } from "../inventory/InventoryGrid";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "../client/components/ui/dialog";
import { toast } from "../client/hooks/use-toast";
const categories = { BUG_REPORT: "Anomalie", FEATURE_REQUEST: "Suggestion", SUPPORT: "Assistance" };
const statuses = { OPEN: "Ouvert", IN_PROGRESS: "En cours", WAITING: "En attente", RESOLVED: "Résolu", CLOSED: "Fermé" };
const priorities = { LOW: "Basse", NORMAL: "Normale", HIGH: "Haute", URGENT: "Urgente" };
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>);
export function TicketsPage({ user }: { user: User }) {
  const { data, error, refetch } = useQuery(getTickets, {});
  const create = useAction(createTicket), reply = useAction(replyTicket), update = useAction(updateTicket);
  const [selected, setSelected] = useState<string | null>(null), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), [closed, setClosed] = useState(false);
  const ticket = data?.find((row) => row.id === selected);
  const rows = data?.filter((row) => closed || !["RESOLVED", "CLOSED"].includes(row.status)) ?? [];
  async function run(fn: () => Promise<unknown>) { setBusy(true); try { await fn(); await refetch(); return true; } catch (error) { toast({ title: "Action impossible", description: error instanceof Error ? error.message : "Réessayez", variant: "destructive" }); return false; } finally { setBusy(false); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, values = new FormData(form);
    if (await run(() => creating ? create({ title: String(values.get("title")), category: String(values.get("category")) as "SUPPORT", body: String(values.get("body")) }) : reply({ ticketId: selected!, body: String(values.get("body")) }))) { form.reset(); setCreating(false); }
  }
  function exportTickets(jsonl: boolean) { const content = jsonl ? rows.map((row) => JSON.stringify(row)).join("\n") : JSON.stringify(rows, null, 2); const url = URL.createObjectURL(new Blob([content], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `tickets.${jsonl ? "jsonl" : "json"}`; link.click(); URL.revokeObjectURL(url); }
  return <main className="yoyorder-workspace w-full min-w-0 space-y-5 px-2 py-5 sm:px-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">{user.isSuperAdmin ? "Tickets des entreprises" : "Assistance"}</h1><a className="text-sm underline" href={user.isSuperAdmin ? "/admin/plans" : "/inventory"}>Retour</a></div><Button onClick={() => { setSelected(null); setCreating(true); }}>Nouveau ticket</Button></div>
    <div className="flex flex-wrap items-center gap-4"><label className="flex gap-2 text-sm"><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />Inclure les tickets résolus et fermés</label>{user.isSuperAdmin && <><Button variant="outline" onClick={() => exportTickets(false)}>Exporter JSON</Button><Button variant="outline" onClick={() => exportTickets(true)}>Exporter JSONL</Button></>}</div>
    {error ? <p className="text-destructive">Impossible de charger les tickets : {error.message}</p> : !data ? <p>Chargement…</p> : <InventoryGrid rows={rows} rowId={(row) => row.id} label="Tickets" columns={[
      { id: "title", label: "Objet", width: 300, value: (row) => row.title, render: (row) => <button className="text-left underline" onClick={() => { setSelected(row.id); setCreating(false); }}>{row.title}</button> },
      { id: "workspace", label: "Entreprise", value: (row) => row.workspace.name },
      { id: "category", label: "Catégorie", value: (row) => categories[row.category as keyof typeof categories] },
      { id: "status", label: "Statut", value: (row) => statuses[row.status as keyof typeof statuses] },
      { id: "priority", label: "Priorité", value: (row) => priorities[row.priority as keyof typeof priorities] },
      { id: "reviewed", label: "Examiné", value: (row) => row.reviewed ? "Oui" : "Non" },
      { id: "author", label: "Auteur", width: 240, value: (row) => row.messages[0]?.authorEmail ?? "" },
      { id: "created", label: "Créé le", value: (row) => new Date(row.createdAt).toLocaleDateString("fr-FR") },
      { id: "updated", label: "Dernière activité", value: (row) => new Date(row.updatedAt).toLocaleString("fr-FR") },
      { id: "messages", label: "Messages", value: (row) => row.messages.length },
    ]} />}
    <Dialog open={creating || Boolean(ticket)} onOpenChange={(open) => { if (!open) { setSelected(null); setCreating(false); } }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogTitle>{creating ? "Nouveau ticket" : ticket?.title}</DialogTitle>
      {ticket && <><p className="text-muted-foreground text-sm">{ticket.workspace.name}</p>{user.isSuperAdmin && <form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); const values = new FormData(e.currentTarget); void run(() => update({ id: ticket.id, status: String(values.get("status")) as "OPEN", priority: String(values.get("priority")) as "NORMAL", reviewed: values.has("reviewed") })); }}><label>Statut<select className="bg-background ml-2 rounded border p-2" name="status" defaultValue={ticket.status}>{options(statuses)}</select></label><label>Priorité<select className="bg-background ml-2 rounded border p-2" name="priority" defaultValue={ticket.priority}>{options(priorities)}</select></label><label className="flex items-center gap-2"><input name="reviewed" type="checkbox" defaultChecked={ticket.reviewed} />Examiné</label><Button disabled={busy}>Enregistrer</Button></form>}
      <div className="space-y-3">{ticket.messages.map((message) => <article key={message.id} className={`rounded border p-3 ${message.isStaff ? "bg-muted" : ""}`}><p className="text-muted-foreground mb-2 text-xs">{message.isStaff ? "Support · " : ""}{message.authorEmail} · {new Date(message.createdAt).toLocaleString("fr-FR")}</p><p className="whitespace-pre-wrap break-words">{message.body}</p></article>)}</div></>}
      <form onSubmit={submit} className="space-y-3">{creating && <><label className="block">Objet<Input name="title" required minLength={3} maxLength={200} /></label><label className="block">Catégorie<select className="bg-background ml-2 rounded border p-2" name="category">{options(categories)}</select></label></>}<label className="block">{creating ? "Description" : "Réponse"}<textarea name="body" className="bg-background mt-1 w-full rounded border p-3" rows={5} required maxLength={20000} /></label><Button disabled={busy}>{busy ? "Enregistrement…" : creating ? "Créer le ticket" : "Envoyer la réponse"}</Button></form>
    </DialogContent></Dialog>
  </main>;
}
