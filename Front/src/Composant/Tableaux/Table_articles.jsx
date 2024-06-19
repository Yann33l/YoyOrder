import { useEffect, useState } from "react";
import { GetActivesArticles } from "../API/api";
import { returnTable } from "./TableStyle";

const IGNORED_FIELDS = ["article_id", "ID"];
const RowID = "ID";
const EDITABLE_COLUMNS = ["SelectCheckBox"];
const CALLER = "SelectionArticles";
const TableArticles = ({ setSelectedRows }) => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const fetchArticles = async () => {
      const fetchedArticles = await GetActivesArticles();
      setArticles(fetchedArticles);
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

export default TableArticles;
