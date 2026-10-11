import { type FormEvent, useState } from "react";
import { getOrders } from "wasp/client/operations";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";

type Order = Awaited<ReturnType<typeof getOrders>>[number];
const date = (value: Date | null) => value ? new Date(value).toLocaleDateString("fr-FR") : "—";
function ReceptionFields({ order, disabled, onSubmit }: { order: Order; disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const [receivedAt, setReceivedAt] = useState(new Date().toLocaleDateString("en-CA"));
  const remaining = Math.max(0, order.quantityOrdered - order.receivedQty);
  return <form className="p-1" onSubmit={onSubmit} aria-label={`Réception de ${order.article.label}, commande ${order.orderNumber || order.id}`}>
    <input type="hidden" name="orderId" value={order.id} />
    <fieldset className="grid grid-cols-[64px_124px_150px_124px] items-end gap-1.5" disabled={disabled}>
      <label className="text-xs">Quantité<Input aria-label="Quantité reçue" className="mt-1 h-9" name="quantity" type="number" min="1" max={remaining} step="1" required /></label>
      <label className="text-xs">Réception<Input aria-label="Date de réception" className="mt-1 h-9" name="receivedAt" type="date" min={order.orderDate ? new Date(order.orderDate).toISOString().slice(0, 10) : undefined} value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required /></label>
      <label className="text-xs">N° de lot<Input aria-label="Numéro de lot" className="mt-1 h-9" name="lot" maxLength={255} required /></label>
      <label className="text-xs">Péremption<Input aria-label="Date de péremption" className="mt-1 h-9" name="expiresAt" type="date" min={receivedAt} /></label>
      <label className="col-span-2 text-xs">Certificat PDF<Input aria-label="Certificat d’analyse PDF" className="mt-1 h-9" name="coa" type="file" accept="application/pdf,.pdf" /></label>
      <label className="text-xs">Commentaire<Input aria-label="Commentaire de réception" className="mt-1 h-9" name="comment" maxLength={255} /></label>
      <Button size="sm" type="submit" disabled={disabled || remaining === 0}>Réceptionner</Button>
    </fieldset>
  </form>;
}

export function ReceptionTable({ orders, disabled, onSubmit }: { orders: Order[]; disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const [supplierId, setSupplierId] = useState("all");
  const pending = orders.filter((order) => order.orderDate && !order.receivedInFull);
  const suppliers = Array.from(new Map(pending.map((order) => [String(order.article.supplier?.id ?? "none"), order.article.supplier?.label ?? "Sans fournisseur"])).entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const rows = supplierId === "all" ? pending : pending.filter((order) => String(order.article.supplier?.id ?? "none") === supplierId);
  const columns: GridColumn<Order>[] = [
    { id: "article", label: "Article", group: "Article", width: 240, value: (order) => order.article.label },
    { id: "reference", label: "Référence", group: "Article", value: (order) => order.article.reference },
    { id: "supplier", label: "Fournisseur", group: "Article", width: 200, value: (order) => order.article.supplier?.label ?? "Sans fournisseur" },
    { id: "orderNumber", label: "N° commande", group: "Commande", value: (order) => order.orderNumber },
    { id: "requestDate", label: "Date de demande", group: "Commande", value: (order) => date(order.requestDate) },
    { id: "orderDate", label: "Date de commande", group: "Commande", value: (order) => date(order.orderDate) },
    { id: "sectors", label: "Secteurs", group: "Commande", width: 220, value: (order) => order.sectors.map((entry) => `${entry.sector.label} : ${entry.quantity}`).join(" · ") },
    { id: "quantityOrdered", label: "Commandé", group: "Quantités", value: (order) => order.quantityOrdered },
    { id: "receivedQty", label: "Déjà reçu", group: "Quantités", value: (order) => order.receivedQty },
    { id: "remaining", label: "À recevoir", group: "Quantités", value: (order) => Math.max(0, order.quantityOrdered - order.receivedQty) },
    { id: "comment", label: "Commentaire commande", group: "Commande", width: 220, value: (order) => order.comment },
    { id: "reception", label: "Tracer une réception", group: "Réception", width: 510, value: () => "", render: (order) => <ReceptionFields order={order} disabled={disabled} onSubmit={onSubmit} /> },
  ];
  return <section className="space-y-3">
    <h2 className="text-lg font-semibold">Articles en attente de réception</h2>
    <p className="text-muted-foreground text-sm">Saisissez la réception sur la ligne de commande. Une réception partielle laisse le reste en attente ; chaque réception crée son lot et conserve son certificat.</p>
    <label className="flex items-center gap-3 text-sm">Fournisseur<select className="h-9 rounded-md border bg-background px-3" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="all">Tous les fournisseurs</option>{suppliers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <InventoryGrid label="Réceptions en attente" rows={rows} columns={columns} rowId={(order) => order.id} emptyMessage="Aucune commande en attente de réception." />
  </section>;
}
