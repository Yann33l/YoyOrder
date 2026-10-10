import { useState, type FormEvent } from "react";
import { getCatalog, saveCatalogItem, setArticleComposition, useAction } from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../client/components/ui/dialog";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";
import { toast } from "../client/hooks/use-toast";

type Catalog = Awaited<ReturnType<typeof getCatalog>>;
type Kind = "supplier" | "sector" | "piece" | "article" | "subArticle";
type Item = { id: number; label: string; reference?: string | null; packaging?: string | null; supplierId?: number | null; telephone?: string | null; email?: string | null; website?: string | null; sectors?: { sectorId: number }[]; pieces?: { pieceId: number }[] };
type Tab = "suppliers" | "sectors" | "pieces" | "articles" | "compositions";
const tabs: { id: Tab; label: string; kind: Kind }[] = [
  { id: "suppliers", label: "Fournisseurs", kind: "supplier" }, { id: "sectors", label: "Secteurs", kind: "sector" }, { id: "pieces", label: "Pièces", kind: "piece" }, { id: "articles", label: "Articles", kind: "article" }, { id: "compositions", label: "Compositions (sous-articles)", kind: "subArticle" },
];
export function CatalogPage({ catalog, onSaved }: { catalog: Catalog; onSaved: () => Promise<unknown> }) {
  const [tab, setTab] = useState<Tab>("articles");
  const [edit, setEdit] = useState<{ kind: Kind; item?: Item } | null>(null);
  const [saving, setSaving] = useState(false);
  const [articleId, setArticleId] = useState("");
  const saveItem = useAction(saveCatalogItem);
  const saveComposition = useAction(setArticleComposition);
  const current = tabs.find((entry) => entry.id === tab)!;
  const selectedArticle = catalog.articles.find((article) => String(article.id) === articleId) ?? catalog.articles[0];
  const rows: Item[] = tab === "suppliers" ? catalog.suppliers : tab === "sectors" ? catalog.sectors : tab === "pieces" ? catalog.pieces : tab === "articles" ? catalog.articles : catalog.subArticles;
  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!edit) return;
    const values = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const text = (name: string) => String(values.get(name) || "");
      await saveItem({ kind: edit.kind, id: edit.item?.id, label: text("label"),
        ...(edit.kind === "supplier" ? { telephone: text("telephone"), email: text("email"), website: text("website") } : {}),
        ...(edit.kind === "article" || edit.kind === "subArticle" ? { reference: text("reference"), packaging: text("packaging") } : {}),
        ...(edit.kind === "article" ? { supplierId: Number(values.get("supplierId")) || null, sectorIds: values.getAll("sectorIds").map(Number), pieceIds: values.getAll("pieceIds").map(Number) } : {}),
      });
      setEdit(null); await onSaved(); toast({ title: "Référentiel enregistré" });
    } catch (error) { toast({ title: "Enregistrement impossible", description: error instanceof Error ? error.message : "Vérifiez les champs et vos affectations.", variant: "destructive" }); }
    finally { setSaving(false); }
  }
  async function setQuantity(subArticleId: number, quantity: number) {
    if (!selectedArticle) return;
    setSaving(true);
    try { await saveComposition({ articleId: selectedArticle.id, subArticleId, quantity }); await onSaved(); toast({ title: quantity ? "Composition enregistrée" : "Sous-article retiré de la composition" }); }
    catch (error) { toast({ title: "Composition non enregistrée", description: error instanceof Error ? error.message : "Vérifiez vos droits.", variant: "destructive" }); }
    finally { setSaving(false); }
  }
  const columns: GridColumn<Item>[] = [
    { id: "label", label: "Libellé", width: 300, value: (item) => item.label },
    ...(tab === "articles" || tab === "compositions" ? [
      { id: "reference", label: "Référence", width: 150, value: (item: Item) => item.reference ?? null },
      { id: "packaging", label: "Conditionnement", width: 180, value: (item: Item) => item.packaging ?? null },
    ] : []),
    ...(tab === "suppliers" ? [
      { id: "telephone", label: "Téléphone", width: 160, value: (item: Item) => item.telephone ?? null },
      { id: "email", label: "E-mail", width: 230, value: (item: Item) => item.email ?? null },
      { id: "website", label: "Site web", width: 240, value: (item: Item) => item.website ?? null },
    ] : []),
    ...(tab === "articles" ? [
      { id: "supplier", label: "Fournisseur", width: 200, value: (item: Item) => catalog.suppliers.find((supplier) => supplier.id === item.supplierId)?.label ?? "—" },
      { id: "sectors", label: "Secteurs compatibles", width: 220, value: (item: Item) => item.sectors?.map(({ sectorId }) => catalog.sectors.find((sector) => sector.id === sectorId)?.label).filter(Boolean).join(", ") ?? "" },
      { id: "pieces", label: "Pièces", width: 220, value: (item: Item) => item.pieces?.map(({ pieceId }) => catalog.pieces.find((piece) => piece.id === pieceId)?.label).filter(Boolean).join(", ") ?? "" },
    ] : []),
    { id: "edit", label: "Actions", width: 120, value: () => "", render: (item) => <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setEdit({ kind: current.kind, item })}>Modifier</Button> },
  ];
  const compositionRows = catalog.compositions.filter((entry) => entry.articleId === selectedArticle?.id).map((entry) => ({ ...entry, component: catalog.subArticles.find((sub) => sub.id === entry.subArticleId) }));
  return <section className="space-y-5">
    <nav aria-label="Onglets des référentiels" className="flex flex-wrap gap-2 border-b pb-3">{tabs.map((entry) => <Button type="button" key={entry.id} size="sm" variant={tab === entry.id ? "default" : "ghost"} aria-pressed={tab === entry.id} onClick={() => setTab(entry.id)}>{entry.label}</Button>)}</nav>
    {tab === "compositions" && <section className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Composition de l’article</h2>
      <label className="flex flex-wrap items-center gap-3 text-sm">Article<select className="bg-background h-10 min-w-64 rounded-md border px-3" disabled={saving || !catalog.articles.length} value={selectedArticle ? String(selectedArticle.id) : ""} onChange={(event) => setArticleId(event.target.value)}>{catalog.articles.map((article) => <option key={article.id} value={article.id}>{article.label}</option>)}</select></label>
      <InventoryGrid label="Composition de l’article" rows={compositionRows} rowId={(entry) => entry.subArticleId} columns={[
        { id: "component", label: "Sous-article", width: 300, value: (entry) => entry.component?.label ?? "—" },
        { id: "reference", label: "Référence", width: 150, value: (entry) => entry.component?.reference ?? "—" },
        { id: "quantity", label: "Quantité par article", width: 260, value: (entry) => entry.quantity, render: (entry) => <form key={`${selectedArticle?.id}-${entry.subArticleId}-${entry.quantity}`} className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void setQuantity(entry.subArticleId, Number(new FormData(event.currentTarget).get("quantity"))); }}><Input className="h-8 w-20" name="quantity" type="number" min="1" step="1" defaultValue={entry.quantity} required disabled={saving} aria-label={`Quantité ${entry.component?.label}`} /><Button size="sm" variant="outline" disabled={saving}>Enregistrer</Button></form> },
        { id: "remove", label: "Actions", width: 120, value: () => "", render: (entry) => <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void setQuantity(entry.subArticleId, 0)}>Retirer</Button> },
      ]} emptyMessage="Cet article ne contient pas encore de sous-article." />
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); void setQuantity(Number(values.get("subArticleId")), Number(values.get("quantity"))); }}>
        <label className="space-y-1 text-sm">Sous-article à ajouter<select name="subArticleId" className="bg-background block h-10 rounded-md border px-3" required disabled={saving}>{catalog.subArticles.filter((sub) => !compositionRows.some((entry) => entry.subArticleId === sub.id)).map((sub) => <option key={sub.id} value={sub.id}>{sub.label}</option>)}</select></label>
        <label className="space-y-1 text-sm">Quantité<Input className="w-24" name="quantity" type="number" min="1" step="1" defaultValue={1} required disabled={saving} /></label>
        <Button disabled={saving || !selectedArticle || !catalog.subArticles.some((sub) => !compositionRows.some((entry) => entry.subArticleId === sub.id))}>Ajouter à la composition</Button>
      </form>
    </section>}
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{tab === "compositions" ? "Catalogue des sous-articles" : current.label}</h2><Button type="button" disabled={saving} onClick={() => setEdit({ kind: current.kind })}>{tab === "compositions" ? "Créer un sous-article" : "Créer"}</Button></div>
    <InventoryGrid label={current.label} rows={rows} columns={columns} rowId={(item) => item.id} />
    <Dialog open={!!edit} onOpenChange={(open) => { if (!open && !saving) setEdit(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{edit?.item ? "Modifier" : "Créer"} · {current.label}</DialogTitle></DialogHeader>
      {edit && <form key={`${edit.kind}-${edit.item?.id ?? "new"}`} className="grid gap-4 sm:grid-cols-2" onSubmit={submitItem}>
        <label className="space-y-1 text-sm sm:col-span-2">Libellé<Input name="label" defaultValue={edit.item?.label} required maxLength={255} /></label>
        {(edit.kind === "article" || edit.kind === "subArticle") && <><label className="space-y-1 text-sm">Référence<Input name="reference" defaultValue={edit.item?.reference ?? ""} maxLength={255} /></label><label className="space-y-1 text-sm">Conditionnement<Input name="packaging" defaultValue={edit.item?.packaging ?? ""} maxLength={255} /></label></>}
        {edit.kind === "supplier" && <><label className="space-y-1 text-sm">Téléphone<Input name="telephone" defaultValue={edit.item?.telephone ?? ""} maxLength={255} /></label><label className="space-y-1 text-sm">E-mail<Input name="email" type="email" defaultValue={edit.item?.email ?? ""} /></label><label className="space-y-1 text-sm sm:col-span-2">Site web<Input name="website" type="url" defaultValue={edit.item?.website ?? ""} placeholder="https://" /></label></>}
        {edit.kind === "article" && <><label className="space-y-1 text-sm sm:col-span-2">Fournisseur<select name="supplierId" className="bg-background block h-10 w-full rounded-md border px-3" defaultValue={edit.item?.supplierId ?? ""}><option value="">Aucun</option>{catalog.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}</select></label><CheckGroup name="sectorIds" title="Secteurs compatibles" options={catalog.sectors} selected={edit.item?.sectors?.map(({ sectorId }) => sectorId) ?? []} /><CheckGroup name="pieceIds" title="Pièces" options={catalog.pieces} selected={edit.item?.pieces?.map(({ pieceId }) => pieceId) ?? []} /></>}
        <Button className="sm:col-span-2" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
      </form>}
    </DialogContent></Dialog>
  </section>;
}
function CheckGroup({ name, title, options, selected }: { name: string; title: string; options: { id: number; label: string }[]; selected: number[] }) {
  return <fieldset><legend className="mb-2 text-sm font-medium">{title}</legend><div className="max-h-40 space-y-2 overflow-auto rounded-md border p-3">{options.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm"><input name={name} value={option.id} type="checkbox" defaultChecked={selected.includes(option.id)} />{option.label}</label>)}{!options.length && <p className="text-muted-foreground text-sm">Créez d’abord un élément dans l’onglet correspondant.</p>}</div></fieldset>;
}
