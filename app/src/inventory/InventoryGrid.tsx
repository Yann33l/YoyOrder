import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { filterAndSortRows, csvContent } from "./gridData";
import "./inventory-grid.css";

export type GridColumn<Row> = {
  id: string;
  label: string;
  group?: string;
  width?: number;
  editable?: boolean;
  value: (row: Row) => string | number | null;
  render?: (row: Row) => ReactNode;
};

export function InventoryGrid<Row>({ rows, columns, rowId, label, emptyMessage = "Aucune ligne à afficher." }: {
  rows: Row[];
  columns: GridColumn<Row>[];
  rowId: (row: Row) => string | number;
  label: string;
  emptyMessage?: string;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState<{ id: string; descending: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [compact, setCompact] = useState(true);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const visible = columns.filter((column) => !hidden.includes(column.id));
  const filtered = filterAndSortRows(rows, columns, search, filters, sort);
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageRows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const groups: { name: string; count: number }[] = [];
  visible.forEach((column) => {
    const name = column.group ?? "";
    if (groups.at(-1)?.name === name) groups[groups.length - 1].count++;
    else groups.push({ name, count: 1 });
  });

  function exportCsv() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", csvContent(filtered, visible)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${label}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`inventory-grid ${compact ? "inventory-grid-compact" : ""}`}>
      <div className="inventory-grid-toolbar">
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" aria-hidden="true" />
          <Input className="h-9 pl-9" aria-label={`Rechercher dans ${label}`} placeholder="Rechercher…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        </div>
        <Button type="button" variant="ghost" size="sm" aria-pressed={showFilters} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="size-4" />Filtres</Button>
        <details className="relative">
          <summary className="cursor-pointer rounded px-3 py-2 text-sm">Colonnes</summary>
          <div className="bg-background absolute right-0 z-30 min-w-56 rounded-md border p-3 shadow-lg">
            {columns.map((column) => <label key={column.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={!hidden.includes(column.id)} disabled={visible.length === 1 && !hidden.includes(column.id)} onChange={() => setHidden(hidden.includes(column.id) ? hidden.filter((id) => id !== column.id) : [...hidden, column.id])} />{column.label}</label>)}
          </div>
        </details>
        <label className="flex items-center gap-2 text-sm">Densité<select className="bg-background rounded border px-2 py-1" value={compact ? "compact" : "comfortable"} onChange={(event) => setCompact(event.target.value === "compact")}><option value="compact">Compacte</option><option value="comfortable">Confortable</option></select></label>
        <Button type="button" variant="ghost" size="sm" disabled={!filtered.length} onClick={exportCsv}><Download className="size-4" />Exporter</Button>
        {(search || Object.values(filters).some(Boolean) || sort) && <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setFilters({}); setSort(null); setPage(0); }}>Réinitialiser</Button>}
      </div>
      <div className="inventory-grid-scroll" tabIndex={0} aria-label={`Défilement du tableau ${label}`}>
        <table aria-label={label} style={{ width: visible.reduce((sum, column) => sum + (widths[column.id] ?? column.width ?? 150), 0), minWidth: "100%" }}>
          <colgroup>{visible.map((column) => <col key={column.id} style={{ width: widths[column.id] ?? column.width ?? 150 }} />)}</colgroup>
          <thead>
            <tr className="inventory-grid-groups">{groups.map((group, index) => <th key={index} colSpan={group.count} scope="colgroup">{group.name}</th>)}</tr>
            <tr>{visible.map((column) => <th key={column.id} scope="col" aria-sort={sort?.id === column.id ? sort.descending ? "descending" : "ascending" : "none"} className={column.editable ? "inventory-grid-editable" : ""}>
              <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => { setSort(sort?.id === column.id ? sort.descending ? null : { id: column.id, descending: true } : { id: column.id, descending: false }); setPage(0); }}>{column.label}{sort?.id === column.id && (sort.descending ? <ArrowDown className="size-3 shrink-0" /> : <ArrowUp className="size-3 shrink-0" />)}</button>
              <span role="separator" aria-label={`Largeur de ${column.label}`} aria-orientation="vertical" tabIndex={0} className="inventory-grid-resize" onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setWidths({ ...widths, [column.id]: Math.max(80, (widths[column.id] ?? column.width ?? 150) + (event.key === "ArrowRight" ? 20 : -20)) }); } }} onPointerDown={(event) => {
                event.preventDefault();
                const start = event.clientX;
                const width = widths[column.id] ?? column.width ?? 150;
                const target = event.currentTarget;
                target.setPointerCapture(event.pointerId);
                target.onpointermove = (move) => setWidths((current) => ({ ...current, [column.id]: Math.max(80, width + move.clientX - start) }));
                target.onpointerup = () => { target.onpointermove = null; target.onpointerup = null; };
              }} />
            </th>)}</tr>
            {showFilters && <tr className="inventory-grid-filters">{visible.map((column) => <th key={column.id}><input aria-label={`Filtrer ${column.label}`} placeholder="Filtrer…" value={filters[column.id] ?? ""} onChange={(event) => { setFilters({ ...filters, [column.id]: event.target.value }); setPage(0); }} /></th>)}</tr>}
          </thead>
          <tbody>{pageRows.map((row) => <tr key={rowId(row)}>{visible.map((column) => <td key={column.id}>{column.render ? column.render(row) : column.value(row) ?? "—"}</td>)}</tr>)}</tbody>
        </table>
        {!pageRows.length && <p className="text-muted-foreground p-8 text-center text-sm">{rows.length ? "Aucun résultat pour ces filtres." : emptyMessage}</p>}
      </div>
      <div className="inventory-grid-footer">
        <span>{filtered.length ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} sur ${filtered.length}` : "0 ligne"}{filtered.length !== rows.length && ` (${rows.length} au total)`}</span>
        <label className="ml-auto flex items-center gap-2">Lignes par page<select className="bg-background rounded border px-2 py-1" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}>{[10, 25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label>
        <Button type="button" variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Page précédente">‹</Button>
        <Button type="button" variant="ghost" size="sm" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)} aria-label="Page suivante">›</Button>
      </div>
    </div>
  );
}
