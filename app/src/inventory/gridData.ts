type Column<Row> = { id: string; label: string; value: (row: Row) => string | number | null };
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
export function filterAndSortRows<Row>(rows: Row[], columns: Column<Row>[], search: string, filters: Record<string, string>, sort: { id: string; descending: boolean } | null) {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const result = rows.filter((row) => {
    const text = columns.map((column) => normalize(column.value(row))).join(" ");
    return terms.every((term) => text.includes(term)) && columns.every((column) => !filters[column.id] || normalize(column.value(row)).includes(normalize(filters[column.id])));
  });
  const column = columns.find((item) => item.id === sort?.id);
  if (column && sort) result.sort((a, b) => {
    const left = column.value(a), right = column.value(b);
    const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""), "fr", { numeric: true });
    return sort.descending ? -compared : compared;
  });
  return result;
}
export function csvContent<Row>(rows: Row[], columns: Column<Row>[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    // Empêcher l'interprétation de formules à l'ouverture dans un tableur.
    return `"${(/^[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  };
  return [columns.map((column) => escape(column.label)), ...rows.map((row) => columns.map((column) => escape(column.value(row))))].map((values) => values.join(";")).join("\r\n");
}
