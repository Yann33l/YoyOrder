import { useState, type FormEvent } from "react";
import { getOrders, setBatchOrderPurchase, useAction } from "wasp/client/operations";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { toast } from "../client/hooks/use-toast";

type Order = Awaited<ReturnType<typeof getOrders>>[number];
export function PurchaseTable({ orders, onSaved }: { orders: Order[]; onSaved: () => Promise<unknown> }) {
  const [supplierId, setSupplierId] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const savePurchase = useAction(setBatchOrderPurchase);
  const pending = orders.filter((order) => !order.orderDate);
  const chosen = pending.filter((order) => selected.includes(order.id));
  const suppliers = Array.from(new Map(pending.map((order) => [String(order.article.supplier?.id ?? "none"), order.article.supplier?.label ?? "Sans fournisseur"])).entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const rows = supplierId === "all" ? pending : pending.filter((order) => String(order.article.supplier?.id ?? "none") === supplierId);
  const earliestDate = chosen.map((order) => order.requestDate ? new Date(order.requestDate).toISOString().slice(0, 10) : "").sort().at(-1);
  const mixedSuppliers = new Set(chosen.map((order) => order.article.supplier?.id ?? null)).size > 1;
  function toggle(id: number) { setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    try {
      const result = await savePurchase({ orderIds: chosen.map((order) => order.id), orderDate: String(values.get("date")), orderNumber: String(values.get("number") || ""), comment: String(values.get("comment") || "") });
      setSelected([]); form.reset(); await onSaved();
      toast({ title: "Commande enregistrée", description: `${result.count} demande(s) regroupée(s).` });
    } catch (error) {
      toast({ title: "Commande non enregistrée", description: error instanceof Error ? error.message : "Vérifiez la sélection et la date.", variant: "destructive" });
      await onSaved();
    } finally { setSaving(false); }
  }
  const columns: GridColumn<Order>[] = [
    { id: "selection", label: "Sélection", width: 90, value: (order) => selected.includes(order.id) ? "Oui" : "Non", header: (filtered) => <input type="checkbox" aria-label="Sélectionner toutes les demandes filtrées" disabled={saving || !filtered.length} checked={filtered.length > 0 && filtered.every((order) => selected.includes(order.id))} ref={(element) => { if (element) element.indeterminate = filtered.some((order) => selected.includes(order.id)) && !filtered.every((order) => selected.includes(order.id)); }} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...filtered.map((order) => order.id)])] : selected.filter((id) => !filtered.some((order) => order.id === id)))} />, render: (order) => <input type="checkbox" aria-label={`Sélectionner ${order.article.label}, demande ${order.id}`} checked={selected.includes(order.id)} disabled={saving} onChange={() => toggle(order.id)} /> },
    { id: "article", label: "Article", group: "Articles", width: 280, value: (order) => order.article.label },
    { id: "reference", label: "Référence", group: "Articles", width: 140, value: (order) => order.article.reference },
    { id: "supplier", label: "Fournisseur", group: "Articles", width: 220, value: (order) => order.article.supplier?.label ?? "Sans fournisseur" },
    { id: "sectors", label: "Secteurs", group: "Demande", width: 220, value: (order) => order.sectors.map(({ sector, quantity }) => `${sector.label} : ${quantity}`).join(", ") },
    { id: "quantity", label: "Quantité", group: "Demande", width: 110, value: (order) => order.sectors.reduce((sum, item) => sum + item.quantity, 0) },
    { id: "date", label: "Date de demande", group: "Demande", width: 150, value: (order) => order.requestDate ? new Date(order.requestDate).toISOString().slice(0, 10) : "", render: (order) => order.requestDate ? new Date(order.requestDate).toLocaleDateString("fr-FR") : "—" },
    { id: "comment", label: "Commentaire demande", group: "Demande", width: 240, value: (order) => order.requesterComment },
  ];
  return <>
    <div className="mb-4 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">Fournisseur<select className="bg-background h-9 rounded-md border px-3" value={supplierId} disabled={saving} onChange={(event) => { setSupplierId(event.target.value); setSelected([]); }}><option value="all">Tous les fournisseurs</option>{suppliers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><span className="text-muted-foreground text-sm">{pending.length} demande(s) en attente</span></div>
    <InventoryGrid rows={rows} columns={columns} rowId={(order) => order.id} label="Demandes en attente de commande" emptyMessage="Aucune demande à commander pour ce fournisseur." />
    <form className="mt-4 rounded-lg border p-4" onSubmit={submit}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">Commande commune · {chosen.length} demande(s) sélectionnée(s)</h3><Button type="button" variant="ghost" size="sm" disabled={saving || !selected.length} onClick={() => setSelected([])}>Vider la sélection</Button></div>
      {chosen.length > 0 && <p className="text-muted-foreground mb-3 text-sm">{chosen.map((order) => `${order.article.label} (#${order.id})`).join(", ")}</p>}
      {mixedSuppliers && <p className="text-destructive mb-3 text-sm">Sélectionnez des articles du même fournisseur pour une commande commune.</p>}
      <fieldset disabled={saving || !chosen.length} className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">Date de commande<Input name="date" type="date" min={earliestDate} required /></label>
        <label className="space-y-1 text-sm">N° de commande<Input name="number" maxLength={255} /></label>
        <label className="space-y-1 text-sm">Commentaire de commande<Input name="comment" maxLength={255} /></label>
      </fieldset>
      <Button className="mt-4" type="submit" disabled={saving || !chosen.length || mixedSuppliers}>{saving ? "Enregistrement…" : "Enregistrer la commande sélectionnée"}</Button>
    </form>
  </>;
}
