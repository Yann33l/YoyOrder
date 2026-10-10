import { describe, expect, it } from "vitest";
import { csvContent, filterAndSortRows } from "./gridData";
const rows = [{ name: "Éthanol", quantity: 10 }, { name: "Acétone", quantity: 2 }, { name: "Éthanol", quantity: 0 }];
const columns = [{ id: "name", label: "Article", value: (row: typeof rows[number]) => row.name }, { id: "quantity", label: "Quantité", value: (row: typeof rows[number]) => row.quantity }];
describe("Grilles de laboratoire", () => {
  it("combine recherche sans accents et filtre par colonne", () => {
    expect(filterAndSortRows(rows, columns, "ethanol", { quantity: "0" }, null)).toEqual([rows[0], rows[2]]);
  });
  it("trie numériquement sans modifier les données sources", () => {
    expect(filterAndSortRows(rows, columns, "", {}, { id: "quantity", descending: false }).map((row) => row.quantity)).toEqual([0, 2, 10]);
    expect(rows[0].quantity).toBe(10);
  });
  it("exporte les colonnes choisies et neutralise les formules de tableur", () => {
    expect(csvContent([{ name: '=HYPERLINK("example")', quantity: 2 }], [columns[0]])).toBe('"Article"\r\n"\'=HYPERLINK(""example"")"');
  });
});
