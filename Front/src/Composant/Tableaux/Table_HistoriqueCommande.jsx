import { useCallback, useEffect, useState } from "react";
import { getDataForTables } from "../API/api";
import { returnTable } from "./TableStyle";

const IGNORED_FIELDS = [
  "id",
  "article_id",
  "sous_article_id",
  "commande_id",
  "sous_commande_id",
  "reception_id",
];
const EDITABLE_COLUMNS = [];
const RowID = "id";
const CALLER = "historiqueReception";

const TableArticlesReception = () => {
  const [data, setData] = useState([]);

  const updateData = useCallback(async () => {
    try {
      const responseData = await getDataForTables(
        setData,
        "historiqueReception"
      );
      const dataWithIds = responseData.results.map((row, index) => ({
        ...row,
        id: index,
      }));
      setData(dataWithIds);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    updateData();
  }, [updateData]);

  return returnTable(
    RowID,
    data,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    null,
    null,
    null,
    CALLER
  );
};

export default TableArticlesReception;
