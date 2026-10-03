import { useState, type FormEvent, type ReactNode } from "react";
import {
  createArticle,
  createPiece,
  createRequest,
  createSector,
  createSupplier,
  downloadCertificate,
  getCatalog,
  getInventoryOverview,
  getOrders,
  getStock,
  getWorkspaceUsers,
  registerReception,
  setOrderPurchase,
  updateStock,
  updateUserAccess,
  useAction,
  useQuery,
} from "wasp/client/operations";
import type { User } from "wasp/entities";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { toast } from "../client/hooks/use-toast";

type View = "overview" | "requests" | "orders" | "stock" | "catalog";

function formData(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}

function dateValue(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export function InventoryPage({ user }: { user: User }) {
  const [view, setView] = useState<View>("overview");
  const [working, setWorking] = useState(false);
  const { data: overview, isLoading, error } = useQuery(getInventoryOverview, {});
  const { data: catalog, refetch: refetchCatalog } = useQuery(getCatalog, {});
  const { data: orders, refetch: refetchOrders } = useQuery(getOrders, {});
  const { data: stock, refetch: refetchStock } = useQuery(getStock, {});
  const { data: workspaceUsers, refetch: refetchWorkspaceUsers } = useQuery(
    getWorkspaceUsers,
    {},
    { enabled: user.isAdmin },
  );
  const createRequestAction = useAction(createRequest);
  const setOrderPurchaseAction = useAction(setOrderPurchase);
  const registerReceptionAction = useAction(registerReception);
  const updateStockAction = useAction(updateStock);
  const createSupplierAction = useAction(createSupplier);
  const createArticleAction = useAction(createArticle);
  const createSectorAction = useAction(createSector);
  const createPieceAction = useAction(createPiece);
  const downloadCertificateAction = useAction(downloadCertificate);

  async function run(operation: () => Promise<unknown>, refresh: () => Promise<unknown>): Promise<boolean> {
    setWorking(true);
    try {
      await operation();
      await refresh();
      toast({ title: "Modifications enregistrées" });
      return true;
    } catch {
      toast({
        title: "Enregistrement impossible",
        description: "Vérifiez les champs et vos droits, puis réessayez.",
        variant: "destructive",
      });
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function onCreateRequest(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const saved = await run(
      () => createRequestAction({
        articleId: Number(values.get("articleId")),
        sectorId: Number(values.get("sectorId")),
        quantity: Number(values.get("quantity")),
        requestDate: String(values.get("requestDate")),
        comment: String(values.get("comment") || ""),
      }),
      refetchOrders,
    );
    if (saved) form.reset();
  }

  async function onSetPurchase(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const saved = await run(
      () => setOrderPurchaseAction({
        orderId: Number(values.get("orderId")),
        orderNumber: String(values.get("orderNumber") || ""),
        orderDate: String(values.get("orderDate")),
        comment: String(values.get("comment") || ""),
      }),
      refetchOrders,
    );
    if (saved) form.reset();
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

  async function onCreateSupplier(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const saved = await run(
      () => createSupplierAction({ label: String(values.get("label")) }),
      refetchCatalog,
    );
    if (saved) form.reset();
  }

  async function onCreateSector(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const saved = await run(() => createSectorAction({ label: String(values.get("label")) }), refetchCatalog);
    if (saved) form.reset();
  }

  async function onCreatePiece(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const saved = await run(() => createPieceAction({ label: String(values.get("label")) }), refetchCatalog);
    if (saved) form.reset();
  }

  async function onCreateArticle(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = formData(event);
    const selected = (name: string) =>
      Array.from(form.querySelector<HTMLSelectElement>(`[name="${name}"]`)?.selectedOptions ?? [])
        .map((option) => Number(option.value));
    const saved = await run(
      () => createArticleAction({
        label: String(values.get("label")),
        reference: String(values.get("reference") || ""),
        packaging: String(values.get("packaging") || ""),
        supplierId: Number(values.get("supplierId")) || undefined,
        sectorIds: selected("sectorIds"),
        pieceIds: selected("pieceIds"),
      }),
      refetchCatalog,
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

  if (!user.isAuthorized) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Compte en attente d’activation</h1>
        <p className="text-muted-foreground mt-2">Un administrateur doit activer votre accès à YoyOrder.</p>
      </main>
    );
  }

  const tabs: { id: View; label: string; visible: boolean }[] = [
    { id: "overview", label: "Vue d’ensemble", visible: true },
    { id: "requests", label: "Demandes", visible: user.isRequester || user.isAdmin },
    { id: "orders", label: "Commandes", visible: user.isBuyer || user.isAdmin },
    { id: "stock", label: "Réceptions et stock", visible: user.isRequester || user.isAdmin },
    { id: "catalog", label: "Référentiels", visible: user.isEditor || user.isAdmin },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Laboratoire</p>
          <h1 className="text-2xl font-semibold">Stocks et commandes</h1>
        </div>
        {isLoading && <span className="text-muted-foreground text-sm">Chargement…</span>}
      </div>
      <nav aria-label="Sections de travail" className="mb-6 flex flex-wrap gap-2 border-b pb-3">
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
          {user.isAdmin && workspaceUsers && workspaceUsers.length > 0 && (
            <section className="mt-8 border-t pt-6">
              <h2 className="text-lg font-semibold">Accès utilisateurs</h2>
              <div className="mt-3 divide-y">
                {workspaceUsers.map((account) => (
                  <UserAccessRow
                    account={account}
                    key={account.id}
                    sectors={catalog?.sectors ?? []}
                    onSaved={() => refetchWorkspaceUsers().then(() => undefined)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : view === "requests" ? (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Demandes en cours</h2>
            <OrderTable orders={orders ?? []} />
          </div>
          <Card>
            <CardHeader><CardTitle>Nouvelle demande</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onCreateRequest}>
                <Field label="Article"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="articleId" required>{catalog?.articles.map((article) => <option key={article.id} value={article.id}>{article.label}</option>)}</select></Field>
                <Field label="Secteur"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="sectorId" required>{catalog?.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}</select></Field>
                <Field label="Quantité"><Input name="quantity" type="number" min="1" step="1" required /></Field>
                <Field label="Date souhaitée"><Input name="requestDate" type="date" required /></Field>
                <Field label="Commentaire"><Input name="comment" maxLength={255} /></Field>
                <Button disabled={working || !catalog?.articles.length || !catalog?.sectors.length}>Envoyer la demande</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : view === "orders" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">À commander</h2>
          <OrderTable orders={orders ?? []} />
          <Card className="mt-6 max-w-2xl">
            <CardHeader><CardTitle>Enregistrer une commande fournisseur</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSetPurchase}>
                <Field label="Demande"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="orderId" required>{orders?.filter((order) => !order.orderDate).map((order) => <option key={order.id} value={order.id}>#{order.id} · {order.article.label}</option>)}</select></Field>
                <Field label="N° de commande"><Input name="orderNumber" maxLength={255} /></Field>
                <Field label="Date de commande"><Input name="orderDate" type="date" required /></Field>
                <Field label="Commentaire"><Input name="comment" maxLength={255} /></Field>
                <Button className="sm:col-span-2" disabled={working || !orders?.some((order) => !order.orderDate)}>Enregistrer</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : view === "stock" ? (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Lots</h2>
            <div className="overflow-x-auto border-y">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-muted-foreground border-b"><tr><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Quantité reçue</th><th className="py-2 pr-4">Restante</th><th className="py-2">Péremption</th></tr></thead>
                <tbody>{stock?.map((lot) => <StockRow key={lot.id} lot={lot} disabled={working} onSave={(remainingQty) => void run(() => updateStockAction({ stockId: lot.id, remainingQty }), refetchStock)} onDownload={() => void onDownloadCertificate(lot.id)} />)}</tbody>
              </table>
            </div>
          </div>
          <Card>
            <CardHeader><CardTitle>Enregistrer une réception</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onRegisterReception}>
                <Field label="Commande"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="orderId" required>{orders?.filter((order) => order.orderDate && !order.receivedInFull).map((order) => <option key={order.id} value={order.id}>#{order.orderNumber || order.id} · {order.article.label}</option>)}</select></Field>
                <Field label="Quantité reçue"><Input name="quantity" type="number" min="1" step="1" required /></Field>
                <Field label="Date de réception"><Input name="receivedAt" type="date" required /></Field>
                <Field label="N° de lot"><Input name="lot" maxLength={255} required /></Field>
                <Field label="Date de péremption"><Input name="expiresAt" type="date" /></Field>
                <Field label="Certificat d’analyse"><Input name="coa" type="file" accept="application/pdf,.pdf" /></Field>
                <Field label="Commentaire"><Input name="comment" maxLength={255} /></Field>
                <Button disabled={working || !orders?.some((order) => order.orderDate && !order.receivedInFull)}>Enregistrer la réception</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid gap-8 xl:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Articles</h2>
            <div className="overflow-x-auto border-y">
              <table className="w-full text-left text-sm"><thead className="text-muted-foreground border-b"><tr><th className="py-2 pr-4">Article</th><th className="py-2 pr-4">Référence</th><th className="py-2">Conditionnement</th></tr></thead><tbody>{catalog?.articles.map((article) => <tr className="border-b last:border-0" key={article.id}><td className="py-3 pr-4">{article.label}</td><td className="py-3 pr-4">{article.reference || "—"}</td><td className="py-3">{article.packaging || "—"}</td></tr>)}</tbody></table>
            </div>
          </div>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>Créer un article</CardTitle></CardHeader><CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={onCreateArticle}>
                <Field label="Libellé"><Input name="label" required maxLength={255} /></Field>
                <Field label="Référence"><Input name="reference" maxLength={255} /></Field>
                <Field label="Conditionnement"><Input name="packaging" maxLength={255} /></Field>
                <Field label="Fournisseur"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="supplierId"><option value="">Aucun</option>{catalog?.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}</select></Field>
                <Field label="Secteurs"><select className="h-24 w-full rounded-md border bg-background px-3 text-sm" name="sectorIds" multiple>{catalog?.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}</select></Field>
                <Field label="Pièces"><select className="h-24 w-full rounded-md border bg-background px-3 text-sm" name="pieceIds" multiple>{catalog?.pieces.map((piece) => <option key={piece.id} value={piece.id}>{piece.label}</option>)}</select></Field>
                <Button className="sm:col-span-2" disabled={working}>Créer l’article</Button>
              </form>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Créer un fournisseur</CardTitle></CardHeader><CardContent>
              <form className="flex gap-3" onSubmit={onCreateSupplier}><Input name="label" aria-label="Nom du fournisseur" placeholder="Nom du fournisseur" required maxLength={255} /><Button disabled={working}>Ajouter</Button></form>
            </CardContent></Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card><CardHeader><CardTitle>Créer un secteur</CardTitle></CardHeader><CardContent>
                <form className="flex gap-3" onSubmit={onCreateSector}><Input name="label" aria-label="Nom du secteur" placeholder="Nom du secteur" required maxLength={255} /><Button disabled={working}>Ajouter</Button></form>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Créer une pièce</CardTitle></CardHeader><CardContent>
                <form className="flex gap-3" onSubmit={onCreatePiece}><Input name="label" aria-label="Nom de la pièce" placeholder="Nom de la pièce" required maxLength={255} /><Button disabled={working}>Ajouter</Button></form>
              </CardContent></Card>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function UserAccessRow({
  account,
  sectors,
  onSaved,
}: {
  account: Awaited<ReturnType<typeof getWorkspaceUsers>>[number];
  sectors: Awaited<ReturnType<typeof getCatalog>>["sectors"];
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const saveAccess = useAction(updateUserAccess);

  async function submit(event: FormEvent<HTMLFormElement>) {
    const values = formData(event);
    setSaving(true);
    try {
      await saveAccess({
        userId: account.id,
        isAuthorized: values.get("isAuthorized") === "on",
        isRequester: values.get("isRequester") === "on",
        isBuyer: values.get("isBuyer") === "on",
        isEditor: values.get("isEditor") === "on",
        sectorIds: values.getAll("sectorIds").map(Number),
      });
      await onSaved();
      toast({ title: "Droits mis à jour" });
    } catch {
      toast({ title: "Droits non enregistrés", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 py-4 xl:grid-cols-[minmax(170px,1fr)_repeat(4,auto)_minmax(170px,220px)_auto] xl:items-center" onSubmit={submit}>
      <span className="font-medium">{account.email}</span>
      {([
        ["isAuthorized", "Actif", account.isAuthorized],
        ["isRequester", "Demandeur", account.isRequester],
        ["isBuyer", "Acheteur", account.isBuyer],
        ["isEditor", "Éditeur", account.isEditor],
      ] as const).map(([name, label, checked]) => (
        <label className="flex items-center gap-2 text-sm" key={name}>
          <input defaultChecked={checked} name={name} type="checkbox" />{label}
        </label>
      ))}
      <select
        aria-label={`Secteurs de ${account.email ?? "l’utilisateur"}`}
        className="h-20 rounded-md border bg-background px-3 text-sm"
        defaultValue={account.sectors.map(({ sectorId }) => String(sectorId))}
        multiple
        name="sectorIds"
      >
        {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}
      </select>
      <Button size="sm" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}

function OrderTable({ orders }: { orders: Awaited<ReturnType<typeof getOrders>> }) {
  return (
    <div className="overflow-x-auto border-y">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="text-muted-foreground border-b"><tr><th className="py-2 pr-4">Article</th><th className="py-2 pr-4">Secteur(s)</th><th className="py-2 pr-4">Quantité</th><th className="py-2 pr-4">Demande</th><th className="py-2 pr-4">Commande</th><th className="py-2">État</th></tr></thead>
        <tbody>{orders.map((order) => <tr className="border-b last:border-0" key={order.id}><td className="py-3 pr-4"><span className="font-medium">{order.article.label}</span><span className="text-muted-foreground block text-xs">{order.article.reference || ""}</span></td><td className="py-3 pr-4">{order.sectors.map((item) => item.sector.label).join(", ")}</td><td className="py-3 pr-4">{order.sectors.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="py-3 pr-4">{dateValue(order.requestDate)}</td><td className="py-3 pr-4">{order.orderNumber || dateValue(order.orderDate)}</td><td className="py-3">{order.receivedInFull ? "Reçue" : order.orderDate ? "Commandée" : "À commander"}</td></tr>)}</tbody>
      </table>
      {orders.length === 0 && <p className="text-muted-foreground py-6 text-sm">Aucune demande pour vos secteurs.</p>}
    </div>
  );
}

function StockRow({ lot, disabled, onSave, onDownload }: {
  lot: { id: number; lot: string | null; initialQty: number | null; remainingQty: number | null; expiresAt: Date | null; hasCertificate: boolean };
  disabled: boolean;
  onSave: (quantity: number) => void;
  onDownload: () => void;
}) {
  const [quantity, setQuantity] = useState(String(lot.remainingQty ?? 0));
  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4">{lot.lot || "—"}</td>
      <td className="py-3 pr-4">{lot.initialQty ?? "—"}</td>
      <td className="py-3 pr-4"><form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); onSave(Number(quantity)); }}><Input className="h-8 w-20" aria-label="Quantité restante" type="number" min="0" max={lot.initialQty ?? undefined} value={quantity} onChange={(event) => setQuantity(event.target.value)} /><Button size="sm" variant="outline" disabled={disabled}>Enregistrer</Button></form></td>
      <td className="py-3">{dateValue(lot.expiresAt)} {lot.hasCertificate && <button className="text-primary ml-2 hover:underline" onClick={onDownload} type="button">Certificat</button>}</td>
    </tr>
  );
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
