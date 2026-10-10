import { useState } from "react";
import { createRequest, getCatalog, useAction } from "wasp/client/operations";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { toast } from "../client/hooks/use-toast";

type Catalog = Awaited<ReturnType<typeof getCatalog>>;
type Article = Catalog["articles"][number];
type Draft = { quantities: Record<number, string>; date: string; comment: string };
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function DemandTable({ catalog, onSaved }: { catalog: Catalog; onSaved: () => Promise<unknown> }) {
  const [pieceId, setPieceId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const saveRequest = useAction(createRequest);
  const draftFor = (id: number): Draft => drafts[id] ?? { quantities: {}, date: today(), comment: "" };
  function change(id: number, patch: Partial<Draft>) { setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { quantities: {}, date: today(), comment: "" }), ...patch } })); }
  async function send(article: Article) {
    const draft = draftFor(article.id);
    if (Object.values(draft.quantities).some((value) => value !== "" && (!Number.isSafeInteger(Number(value)) || Number(value) < 0))) {
      toast({ title: "Les quantités doivent être des nombres entiers positifs ou nuls", variant: "destructive" }); return;
    }
    const sectors = article.sectors.map(({ sectorId }) => ({ sectorId, quantity: Number(draft.quantities[sectorId] ?? 0) })).filter(({ quantity }) => quantity > 0);
    if (!sectors.length || sectors.some(({ quantity }) => !Number.isSafeInteger(quantity)) || !draft.date) {
      toast({ title: "Indiquez une date et au moins une quantité entière positive", variant: "destructive" }); return;
    }
    setSaving(article.id);
    try {
      await saveRequest({ articleId: article.id, sectors, requestDate: draft.date, comment: draft.comment });
      change(article.id, { quantities: {}, comment: "" });
      await onSaved();
      toast({ title: "Demande enregistrée", description: article.label });
    } catch (error) {
      toast({ title: "Demande non enregistrée", description: error instanceof Error ? error.message : "Vérifiez vos affectations et les quantités.", variant: "destructive" });
    } finally { setSaving(null); }
  }
  const columns: GridColumn<Article>[] = [
    { id: "article", label: "Article", group: "Articles", width: 280, value: (article) => article.label },
    { id: "reference", label: "Référence", group: "Articles", width: 130, value: (article) => article.reference },
    { id: "packaging", label: "Conditionnement", group: "Articles", width: 160, value: (article) => article.packaging },
    ...catalog.sectors.map((sector): GridColumn<Article> => ({ id: `sector-${sector.id}`, label: sector.label, group: "Quantités par secteur", width: 120, editable: true, value: (article) => Number(draftFor(article.id).quantities[sector.id] ?? 0), render: (article) => article.sectors.some(({ sectorId }) => sectorId === sector.id) ? <Input type="number" className="h-8" min="0" step="1" aria-label={`Quantité ${article.label} pour ${sector.label}`} placeholder="0" value={draftFor(article.id).quantities[sector.id] ?? ""} disabled={saving !== null} onChange={(event) => change(article.id, { quantities: { ...draftFor(article.id).quantities, [sector.id]: event.target.value } })} /> : <span className="text-muted-foreground" title="Article incompatible avec ce secteur">—</span> })),
    { id: "date", label: "Demande", group: "Dates", width: 170, value: (article) => draftFor(article.id).date, render: (article) => <Input type="date" className="h-8" aria-label={`Date de demande ${article.label}`} value={draftFor(article.id).date} disabled={saving !== null} onChange={(event) => change(article.id, { date: event.target.value })} /> },
    { id: "comment", label: "Demande", group: "Commentaires", width: 240, value: (article) => draftFor(article.id).comment, render: (article) => <Input className="h-8" aria-label={`Commentaire ${article.label}`} maxLength={255} value={draftFor(article.id).comment} disabled={saving !== null} onChange={(event) => change(article.id, { comment: event.target.value })} /> },
    { id: "send", label: "Enregistrer", group: "Action", width: 140, value: () => "", render: (article) => <Button size="sm" type="button" disabled={saving !== null || !article.sectors.some(({ sectorId }) => Number(draftFor(article.id).quantities[sectorId]) > 0)} onClick={() => void send(article)}>{saving === article.id ? "Enregistrement…" : "Envoyer"}</Button> },
  ];
  const selectedPiece = catalog.pieces.some((piece) => piece.id === pieceId) ? pieceId : null;
  const rows = selectedPiece === null ? catalog.articles : catalog.articles.filter((article) => article.pieces.some(({ pieceId }) => pieceId === selectedPiece));
  return <>
    <nav aria-label="Filtrer les articles par pièce" className="mb-4 flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={selectedPiece === null ? "default" : "outline"} aria-pressed={selectedPiece === null} onClick={() => setPieceId(null)}>Toutes les pièces</Button>
      {catalog.pieces.map((piece) => <Button type="button" key={piece.id} size="sm" variant={selectedPiece === piece.id ? "default" : "outline"} aria-pressed={selectedPiece === piece.id} onClick={() => setPieceId(piece.id)}>{piece.label}</Button>)}
    </nav>
    <InventoryGrid rows={rows} columns={columns} rowId={(article) => article.id} label="Articles à demander" emptyMessage="Aucun article accessible pour cette pièce. Vérifiez vos affectations avec l’administrateur." />
    <p className="text-muted-foreground mt-2 text-xs">Saisissez les quantités dans les secteurs compatibles, puis envoyez la demande de la ligne. Vos saisies sont conservées lorsque vous changez de pièce.</p>
  </>;
}
