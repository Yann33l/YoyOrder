import { useEffect, useState, type FormEvent } from "react";
import {
  downloadCertificate,
  getCatalog,
  getInventoryOverview,
  getOrders,
  getStock,
  getMyAccess,
  registerReception,
  setOrderPurchase,
  updateStock,
  useAction,
  useQuery,
} from "wasp/client/operations";
import type { User } from "wasp/entities";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { toast } from "../client/hooks/use-toast";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";
import { hasBusinessRole } from "./permissions";
import { DemandTable } from "./DemandTable";
import { PurchaseTable } from "./PurchaseTable";
import { CatalogPage } from "./CatalogPage";
import { HistoryTable } from "./HistoryTable";
import { ReceptionTable } from "./ReceptionTable";
import { AdminPanel } from "./AdminPanel";
import { CompanyNews } from "./CompanyNews";

type View = "overview" | "requests" | "orders" | "stock" | "catalog" | "history" | "admin";

function formData(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}

function dateValue(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export function InventoryPage({ user: sessionUser }: { user: User }) {
  const { data: access, isLoading: accessLoading, error: accessError, refetch: refetchAccess } = useQuery(getMyAccess, {});
  const user = { ...sessionUser, ...(access ?? { isAuthorized: false, isRequester: false, isBuyer: false, isEditor: false }) };
  const [view, setView] = useState<View>("overview");
  const [working, setWorking] = useState(false);
  const canRequest = hasBusinessRole(user, "isRequester");
  const canBuy = hasBusinessRole(user, "isBuyer");
  const canEdit = hasBusinessRole(user, "isEditor");
  const canViewHistory = user.isAuthorized && (user.isAdmin || canRequest || canBuy);
  useEffect(() => {
    if ((view === "requests" || view === "stock") && !canRequest || view === "orders" && !canBuy || view === "catalog" && !canEdit || view === "history" && !canViewHistory) setView("overview");
  }, [view, canRequest, canBuy, canEdit, canViewHistory]);
  const { data: overview, isLoading, error } = useQuery(getInventoryOverview, {}, { enabled: user.isAuthorized });
  const { data: catalog, refetch: refetchCatalog } = useQuery(getCatalog, {}, { enabled: user.isAuthorized });
  const { data: orders, refetch: refetchOrders } = useQuery(getOrders, {}, { enabled: user.isAuthorized && (canRequest || canBuy) });
  const { data: stock, refetch: refetchStock } = useQuery(getStock, {}, { enabled: user.isAuthorized && (canRequest || canBuy) });
  const setOrderPurchaseAction = useAction(setOrderPurchase);
  const registerReceptionAction = useAction(registerReception);
  const updateStockAction = useAction(updateStock);
  const downloadCertificateAction = useAction(downloadCertificate);

  async function run(operation: () => Promise<unknown>, refresh: () => Promise<unknown>): Promise<boolean> {
    setWorking(true);
    try {
      await operation();
      await refresh();
      toast({ title: "Modifications enregistrées" });
      return true;
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Vérifiez les champs et vos droits, puis réessayez.",
        variant: "destructive",
      });
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function onRegisterReception(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const file = values.get("coa");
    let coaBase64: string | undefined;
    try {
      coaBase64 = file instanceof File && file.size > 0 ? await readFileBase64(file) : undefined;
    } catch {
      toast({ title: "Certificat trop volumineux ou illisible", variant: "destructive" });
      return;
    }
    const saved = await run(
      () => registerReceptionAction({
        orderId: Number(values.get("orderId")),
        quantity: Number(values.get("quantity")),
        receivedAt: String(values.get("receivedAt")),
        lot: String(values.get("lot")),
        expiresAt: String(values.get("expiresAt") || "") || undefined,
        comment: String(values.get("comment") || ""),
        coaBase64,
      }),
      async () => Promise.all([refetchOrders(), refetchStock()]),
    );
    if (saved) form.reset();
  }

  async function onDownloadCertificate(stockId: number) {
    try {
      const certificate = await downloadCertificateAction({ stockId });
      if (!certificate) {
        toast({ title: "Aucun certificat associé à ce lot" });
        return;
      }
      const bytes = Uint8Array.from(atob(certificate.base64), (character) => character.charCodeAt(0));
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = certificate.filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast({ title: "Téléchargement impossible", variant: "destructive" });
    }
  }

  if (accessLoading) return <main className="p-8">Chargement des accès…</main>;
  if (accessError) return <main className="p-8 text-destructive">Impossible de vérifier les accès.</main>;
  if (!user.isAuthorized) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">{user.validUntil && new Date(user.validUntil).toISOString().slice(0, 10) < new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) ? "Compte arrivé en fin de validité" : "Compte en attente d’activation"}</h1>
        <p className="text-muted-foreground mt-2">Un administrateur doit vérifier votre activation et votre fin de validité.</p>
        {!user.workspaceId && <p className="mt-4"><a className="underline" href="/pricing">Créer un espace pour votre entreprise</a></p>}
        {user.workspaceId && user.isAdmin && <p className="mt-4"><a className="underline" href="/pricing">Vérifier l’abonnement de l’entreprise</a></p>}
        {user.isSuperAdmin && <p className="mt-4"><a className="underline" href="/admin/plans">Administration SaaS</a></p>}
      </main>
    );
  }

  const tabs: { id: View; label: string; visible: boolean }[] = [
    { id: "overview", label: "Vue d’ensemble", visible: true },
    { id: "requests", label: "Demandes", visible: canRequest },
    { id: "orders", label: "Commandes", visible: canBuy },
    { id: "stock", label: "Réceptions et stock", visible: canRequest },
    { id: "history", label: "Historique", visible: canViewHistory },
    { id: "catalog", label: "Référentiels", visible: canEdit },
    { id: "admin", label: "Administration", visible: user.isAdmin },
  ];

  return (
    <main className="yoyorder-workspace w-full min-w-0 px-2 py-5 sm:px-3">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{access?.workspaceName ?? "Laboratoire"}</p>
          <h1 className="text-2xl font-semibold">Stocks et commandes</h1>
        </div>
        {isLoading && <span className="text-muted-foreground text-sm">Chargement…</span>}
      </div>
      <nav aria-label="Sections de travail" className="mb-6 flex flex-wrap gap-2 border-b pb-3">
        <a className="rounded px-3 py-2 text-sm" href="/tickets">Assistance</a>
        {user.isAdmin && <a className="rounded px-3 py-2 text-sm" href="/pricing">Abonnement</a>}
        {user.isSuperAdmin && <a className="rounded px-3 py-2 text-sm" href="/admin/plans">Administration SaaS</a>}
        {tabs.filter((tab) => tab.visible).map((tab) => (
          <Button key={tab.id} type="button" size="sm" variant={view === tab.id ? "default" : "ghost"} onClick={() => setView(tab.id)}>
            {tab.label}
          </Button>
        ))}
      </nav>

      {error ? (
        <p className="text-destructive py-6">Impossible de charger les données du laboratoire.</p>
      ) : view === "overview" ? (
        <>
          <CompanyNews canPublish={sessionUser.isAdmin} />
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé du stock">
            {[
              ["Articles", overview?.articleCount],
              ["Lots en stock", overview?.stockCount],
              ["Lots à vérifier", overview?.lowStockCount],
              ...(user.isAdmin ? [["Comptes à activer", overview?.pendingUsers] as const] : []),
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-semibold tabular-nums">{value ?? "—"}</p></CardContent>
              </Card>
            ))}
          </section>
        </>
      ) : view === "requests" ? (
        <section className="space-y-4">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Articles à demander</h2>
            {catalog && <DemandTable catalog={catalog} onSaved={refetchOrders} />}
          </div>
          <details className="pt-4"><summary className="mb-3 cursor-pointer font-medium">Demandes déjà envoyées</summary><OrderTable orders={orders ?? []} /></details>
        </section>
      ) : view === "orders" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">À commander</h2>
          <PurchaseTable orders={orders ?? []} onSaved={refetchOrders} />
          <details className="mt-6"><summary className="mb-3 cursor-pointer font-medium">Commandes déjà enregistrées</summary><OrderTable orders={orders?.filter((order) => order.orderDate) ?? []} canPurchase={canBuy} disabled={working} onPurchase={(order, field, value) => run(() => setOrderPurchaseAction({ orderId: order.id, orderDate: field === "orderDate" ? value : new Date(order.orderDate!).toISOString().slice(0, 10), orderNumber: field === "orderNumber" ? value : order.orderNumber ?? "", comment: field === "comment" ? value : order.comment ?? "" }), refetchOrders)} /></details>
        </section>
      ) : view === "admin" && user.isAdmin ? (
        <AdminPanel actorId={user.id} onChanged={async () => { await refetchAccess(); await Promise.all([refetchCatalog(), refetchOrders(), refetchStock()]); }} />
      ) : view === "history" ? (
        <HistoryTable onDownload={(stockId) => void onDownloadCertificate(stockId)} />
      ) : view === "stock" ? (
        <section className="space-y-4">
          <ReceptionTable orders={orders ?? []} disabled={working} onSubmit={onRegisterReception} />
          <div>
            <h2 className="mb-3 text-lg font-semibold">Lots</h2>
            <StockTable stock={stock ?? []} disabled={working} onSave={(lot, remainingQty) => run(() => updateStockAction({ stockId: lot.id, remainingQty }), refetchStock)} onDownload={(lot) => void onDownloadCertificate(lot.id)} />
          </div>
        </section>
      ) : (
        catalog && <CatalogPage catalog={catalog} onSaved={refetchCatalog} />
      )}
    </main>
  );
}


type OrderRow = Awaited<ReturnType<typeof getOrders>>[number];
type StockRow = Awaited<ReturnType<typeof getStock>>[number];


function EditableCell({ value, label, type = "text", min, max, disabled, display, onSave }: {
  value: string; label: string; type?: "text" | "number" | "date"; min?: number | string; max?: number; disabled?: boolean; display?: string;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try { if (await onSave(draft)) setEditing(false); }
    finally { setSaving(false); }
  }
  return editing ? <form className="flex flex-wrap gap-1" onSubmit={save}>
    <Input autoFocus className="h-8 min-w-20" aria-label={label} type={type} min={min} max={max} maxLength={255} required={type !== "text"} value={draft} disabled={saving} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing(false); } }} />
    <Button type="submit" size="sm" variant="outline" disabled={saving || disabled}>Valider</Button><Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Annuler</Button>
  </form> : <button type="button" className="hover:bg-muted w-full rounded px-1 py-1 text-left underline decoration-dotted underline-offset-4 disabled:no-underline" title={disabled ? undefined : "Cliquer pour modifier · Entrée pour valider · Échap pour annuler"} aria-label={`Modifier ${label}`} disabled={disabled} onClick={() => setEditing(true)}>{display ?? (value || "—")}</button>;
}

function OrderTable({ orders, canPurchase = false, disabled = false, onPurchase }: {
  orders: OrderRow[]; canPurchase?: boolean; disabled?: boolean;
  onPurchase?: (order: OrderRow, field: "orderDate" | "orderNumber" | "comment", value: string) => Promise<boolean>;
}) {
  const sectors = Array.from(new Map(orders.flatMap((order) => order.sectors.map(({ sector }) => [sector.id, sector] as const))).values());
  const columns: GridColumn<OrderRow>[] = [
    { id: "article", label: "Article", group: "Articles", width: 280, value: (order) => order.article.label },
    { id: "reference", label: "Référence", group: "Articles", width: 120, value: (order) => order.article.reference },
    ...sectors.map((sector): GridColumn<OrderRow> => ({ id: `sector-${sector.id}`, label: sector.label, group: "Quantités par secteur", width: 110, value: (order) => order.sectors.find((item) => item.sector.id === sector.id)?.quantity ?? 0 })),
    { id: "quantity", label: "Total", group: "Quantités", width: 90, value: (order) => order.sectors.reduce((sum, item) => sum + item.quantity, 0) },
    { id: "requestDate", label: "Demande", group: "Dates", width: 130, value: (order) => order.requestDate ? new Date(order.requestDate).toISOString().slice(0, 10) : "", render: (order) => dateValue(order.requestDate) },
    { id: "orderDate", label: "Commande", group: "Dates", width: 160, editable: canPurchase, value: (order) => order.orderDate ? new Date(order.orderDate).toISOString().slice(0, 10) : "", render: (order) => canPurchase && onPurchase ? <EditableCell key={`${order.id}-date`} label={`Date de commande ${order.id}`} type="date" min={order.requestDate ? new Date(order.requestDate).toISOString().slice(0, 10) : undefined} value={order.orderDate ? new Date(order.orderDate).toISOString().slice(0, 10) : ""} display={dateValue(order.orderDate)} disabled={disabled} onSave={(value) => onPurchase(order, "orderDate", value)} /> : dateValue(order.orderDate) },
    { id: "orderNumber", label: "N° commande", group: "Commande", editable: canPurchase, value: (order) => order.orderNumber, render: (order) => canPurchase && onPurchase && order.orderDate ? <EditableCell label={`Numéro de commande ${order.id}`} value={order.orderNumber ?? ""} disabled={disabled} onSave={(value) => onPurchase(order, "orderNumber", value)} /> : order.orderNumber || "—" },
    { id: "state", label: "État", group: "Commande", width: 120, value: (order) => order.receivedInFull ? "Reçue" : order.orderDate ? "Commandée" : "À commander", render: (order) => <span className={`inline-block rounded px-2 py-1 text-xs ${order.receivedInFull ? "bg-emerald-100 text-emerald-900" : order.orderDate ? "bg-blue-100 text-blue-900" : "bg-amber-100 text-amber-900"}`}>{order.receivedInFull ? "Reçue" : order.orderDate ? "Commandée" : "À commander"}</span> },
    { id: "requestComment", label: "Demande", group: "Commentaires", width: 220, value: (order) => order.requesterComment },
    { id: "comment", label: "Commande", group: "Commentaires", width: 220, editable: canPurchase, value: (order) => order.comment, render: (order) => canPurchase && onPurchase && order.orderDate ? <EditableCell label={`Commentaire commande ${order.id}`} value={order.comment ?? ""} disabled={disabled} onSave={(value) => onPurchase(order, "comment", value)} /> : order.comment || "—" },
  ];
  return <><InventoryGrid label="Demandes et commandes" rows={orders} columns={columns} rowId={(order) => order.id} emptyMessage="Aucune demande pour vos secteurs." />{canPurchase && <p className="text-muted-foreground mt-2 text-xs">Les colonnes soulignées en doré sont modifiables. Cliquez sur une cellule pour la modifier.</p>}</>;
}

function StockTable({ stock, disabled, onSave, onDownload }: { stock: StockRow[]; disabled: boolean; onSave: (lot: StockRow, quantity: number) => Promise<boolean>; onDownload: (lot: StockRow) => void }) {
  const columns: GridColumn<StockRow>[] = [
    { id: "lot", label: "N° de lot", group: "Lots", width: 200, value: (lot) => lot.lot },
    { id: "initial", label: "Reçue", group: "Quantités", width: 120, value: (lot) => lot.initialQty },
    { id: "remaining", label: "Restante", group: "Quantités", width: 180, editable: true, value: (lot) => lot.remainingQty, render: (lot) => <EditableCell label={`Quantité restante du lot ${lot.lot ?? lot.id}`} type="number" value={String(lot.remainingQty ?? 0)} min={0} max={lot.initialQty ?? undefined} disabled={disabled} onSave={(value) => onSave(lot, Number(value))} /> },
    { id: "expires", label: "Péremption", group: "Dates", width: 190, value: (lot) => lot.expiresAt ? new Date(lot.expiresAt).toISOString().slice(0, 10) : "", render: (lot) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = lot.expiresAt ? Math.ceil((new Date(lot.expiresAt).getTime() - today.getTime()) / 86400000) : null;
      return <span className={`inline-block rounded px-2 py-1 ${days !== null && days < 0 ? "bg-red-100 text-red-900" : days !== null && days < 30 ? "bg-amber-100 text-amber-900" : ""}`}>{dateValue(lot.expiresAt)}{days !== null && days < 0 ? " · Périmé" : days !== null && days < 30 ? " · < 30 jours" : ""}</span>;
    } },
    { id: "certificate", label: "Certificat d’analyse", group: "Documents", width: 190, value: (lot) => lot.hasCertificate ? "Disponible" : "—", render: (lot) => lot.hasCertificate ? <Button type="button" variant="ghost" size="sm" onClick={() => onDownload(lot)}>Télécharger le PDF</Button> : "—" },
  ];
  return <InventoryGrid label="Stock" rows={stock} columns={columns} rowId={(lot) => lot.id} />;
}

function readFileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("Fichier trop volumineux"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
