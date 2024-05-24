import { returnTable } from "./TableStyle";
import { getDataForTables } from "../API/api";
import { useEffect, useState } from "react";

const IGNORED_FIELDS = ["article_id", "id"];
const RowID = "id";
const EDITABLE_COLUMNS = ["SelectCheckBox"];
const CALLER = "SelectionArticlesOuSousArticles";
const TableSousArticles = ({ setSelectedRows }) => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const fetchArticles = async () => {
      const fetchedArticles = await getDataForTables(
        setArticles,
        "get_active_Sous_Articles"
      );
      const dataWithIds = fetchedArticles.results.map((row, index) => ({
        ...row,
        id: index,
      }));
      setArticles(dataWithIds);
    };
    fetchArticles();
  }, []);

  return returnTable(
    RowID,
    articles,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    null,
    null,
    null,
    CALLER,
    null,
    null,
    setSelectedRows
  );
};

export default TableSousArticles;
