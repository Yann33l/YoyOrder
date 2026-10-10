import { getHistory, useQuery } from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";

type Row = Awaited<ReturnType<typeof getHistory>>[number];
const date = (value: Date | null) => value ? new Date(value).toLocaleDateString("fr-FR") : "—";

export function HistoryTable({ onDownload }: { onDownload: (stockId: number) => void }) {
  const { data, isLoading, error } = useQuery(getHistory, {});
  const columns: GridColumn<Row>[] = [
    { id: "article", label: "Article", group: "Article", width: 240, value: (row) => row.article },
    { id: "reference", label: "Référence", group: "Article", value: (row) => row.reference },
    { id: "packaging", label: "Conditionnement", group: "Article", value: (row) => row.packaging },
    { id: "supplier", label: "Fournisseur", group: "Article", width: 200, value: (row) => row.supplier },
    { id: "subArticle", label: "Sous-article", group: "Article", value: (row) => row.subArticle },
    { id: "orderId", label: "ID demande", group: "Demande", value: (row) => row.orderId },
    { id: "requestDate", label: "Date de demande", group: "Demande", value: (row) => date(row.requestDate) },
    { id: "requester", label: "Demandeur", group: "Demande", width: 240, value: (row) => row.requester },
    { id: "sectors", label: "Quantités par secteur", group: "Demande", width: 240, value: (row) => row.sectors },
    { id: "requestedQty", label: "Quantité demandée", group: "Demande", value: (row) => row.requestedQty },
    { id: "requesterComment", label: "Commentaire demande", group: "Demande", width: 240, value: (row) => row.requesterComment },
    { id: "orderNumber", label: "N° commande", group: "Commande", value: (row) => row.orderNumber },
    { id: "orderDate", label: "Date de commande", group: "Commande", value: (row) => date(row.orderDate) },
    { id: "status", label: "Statut", group: "Commande", value: (row) => row.receivedInFull ? "Réception complète" : row.receptionId ? "Réception partielle" : row.orderDate ? "En attente de réception" : "En attente de commande" },
    { id: "orderComment", label: "Commentaire commande", group: "Commande", width: 240, value: (row) => row.orderComment },
    { id: "receptionId", label: "ID réception", group: "Réception", value: (row) => row.receptionId },
    { id: "receivedAt", label: "Date de réception", group: "Réception", value: (row) => date(row.receivedAt) },
    { id: "receivedQty", label: "Quantité reçue", group: "Réception", value: (row) => row.receivedQty },
    { id: "receptionComment", label: "Commentaire réception", group: "Réception", width: 240, value: (row) => row.receptionComment },
    { id: "stockId", label: "ID stock", group: "Lot", value: (row) => row.stockId },
    { id: "lot", label: "N° de lot", group: "Lot", value: (row) => row.lot },
    { id: "initialQty", label: "Quantité initiale", group: "Lot", value: (row) => row.initialQty },
    { id: "remainingQty", label: "Quantité restante du lot", group: "Lot", value: (row) => row.remainingQty },
    { id: "useStartedAt", label: "Début d’utilisation", group: "Lot", value: (row) => date(row.useStartedAt) },
    { id: "useEndedAt", label: "Fin d’utilisation", group: "Lot", value: (row) => date(row.useEndedAt) },
    { id: "receptionRemainingQty", label: "Reste de la réception", group: "Lot", value: (row) => row.receptionRemainingQty },
    { id: "expiresAt", label: "Date de péremption", group: "Lot", value: (row) => date(row.expiresAt) },
    { id: "certificate", label: "Certificat d’analyse", group: "Documents", width: 200, value: (row) => row.hasCertificate ? "Disponible" : "Absent", render: (row) => row.hasCertificate && row.stockId ? <Button type="button" size="sm" variant="ghost" onClick={() => onDownload(row.stockId!)}>Télécharger le PDF</Button> : "—" },
  ];
  return <section className="space-y-3">
    <h2 className="text-lg font-semibold">Historique des demandes, commandes et lots</h2>
    <p className="text-muted-foreground text-sm">Une ligne par réception et lot, y compris les lots épuisés ou périmés. Les demandes sans réception restent visibles. Recherchez un article, fournisseur, numéro de commande ou de lot ; les filtres par colonne permettent d’affiner la recherche.</p>
    {isLoading ? <p>Chargement de l’historique…</p> : error ? <p className="text-destructive">Impossible de charger l’historique.</p> : <InventoryGrid label="Historique" rows={data ?? []} columns={columns} rowId={(row) => row.id} />}
  </section>;
}
