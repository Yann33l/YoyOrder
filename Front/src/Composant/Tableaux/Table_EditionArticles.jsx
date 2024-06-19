import { MenuItem, Select } from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  API_URL,
  GetActiveFournisseurs,
  GetPieces,
  getDataForTables,
} from "../API/api";
import { getAuthHeader } from "../API/token";
import { returnTable } from "./TableStyle";

const IGNORED_FIELDS = ["article_id", "sous_article_id", "id"];
let RowID = "";

const TableEditionArticles = ({ ArticleOuSousArticle }) => {
  const CALLER = ArticleOuSousArticle;
  if (ArticleOuSousArticle === "EditArticle") {
    RowID = "article_id";
  } else {
    RowID = "id";
  }

  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [EDITABLE_COLUMNS, setEDITABLE_COLUMNS] = useState([]);
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    (async () => {
      setFournisseurs(await GetActiveFournisseurs());
      if (ArticleOuSousArticle === "EditArticle") {
        setPieces(await GetPieces());
      }
    })();
  }, [ArticleOuSousArticle]);

  const sousArticlesData = async () => {
    const responseData = await getDataForTables(
      setArticles,
      "getSousArticleForEdit"
    );
    const dataWithIds = responseData.results.map((row, index) => ({
      ...row,
      id: index,
    }));
    setArticles(dataWithIds);
    setEDITABLE_COLUMNS([
      "Sous article",
      "Ref",
      "quantité_Par article",
      "dateDebutValidite",
      "dateFinValidite",
      "Conditionnement",
    ]);
  };

  useEffect(() => {
    (async () => {
      let responseData;
      if (ArticleOuSousArticle === "EditArticle") {
        responseData = await getDataForTables(setArticles, "getArticleForEdit");
        setEDITABLE_COLUMNS(Object.keys(responseData.results[0]));
      } else {
        sousArticlesData();
      }
    })();
  }, [ArticleOuSousArticle]);

  const handleCheckBoxChange = async (params) => {
    const article_id = params.row.article_id;
    const updatedData = [...articles];
    const rowIndex = updatedData.findIndex(
      (row) => row.article_id === article_id
    );
    const newValue = !params.row[params.field];
    const updatedRow = { ...updatedData[rowIndex], [params.field]: newValue };
    updatedData[rowIndex] = updatedRow;
    setArticles(updatedData);

    try {
      let dataChanged = false;
      if (articles[rowIndex] ?? undefined) {
        dataChanged = true;
      } else if (newValue !== articles[rowIndex][params.field]) {
        dataChanged = true;
      }
      if (dataChanged) {
        const requestData = {
          articleID: params.row.article_id,
          pieceEdited: params.field,
          newPieceValue: newValue,
        };
        await axios.put(
          `${API_URL}/editArticle/`,
          requestData,
          getAuthHeader()
        );
        await getDataForTables(setArticles, "getArticleForEdit");
      } else {
        console.log("Aucune modification");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  const renderDropdownCell = (params) => (
    <Select
      value={params.value}
      onChange={(event) => {
        params.api.setEditCellValue({
          id: params.id,
          field: params.field,
          value: event.target.value,
        });
      }}
    >
      {fournisseurs.map((fournisseur) => (
        <MenuItem key={fournisseur.ID} value={fournisseur.libelle}>
          {fournisseur.libelle}
        </MenuItem>
      ))}
    </Select>
  );

  const handleCellEditCommit = async (params) => {
    const { article_id } = params;
    const updatedData = [...articles];
    const rowIndex =
      ArticleOuSousArticle === "EditArticle"
        ? updatedData.findIndex((row) => row.article_id === article_id)
        : updatedData.findIndex((row) => row.id === params.id);

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setArticles(updatedData);

    try {
      const requestData = {
        articleID: updatedData[rowIndex]["article_id"],
        sousArticleID: updatedData[rowIndex]["sous_article_id"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (key === "dateDebutValidite" || key === "dateFinValidite") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== articles[rowIndex][key]) {
            requestData[key] = formattedDate;
            dataChanged = true;
          }
        } else if (key === "Fournisseur") {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            const fournisseurLabelChanged = updatedData[rowIndex][key];
            for (const fournisseur of fournisseurs) {
              if (fournisseur.libelle === fournisseurLabelChanged) {
                requestData["fournisseur_id"] = fournisseur.ID;
              }
            }
            dataChanged = true;
          }
        } else if (key === "Article" || key === "Sous article") {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData["libelle"] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        } else if (key === "quantité_Par article") {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData["quantite"] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData[key.toLowerCase()] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }
      if (dataChanged && ArticleOuSousArticle === "EditArticle") {
        console.log("requestData edit Article", requestData);
        await axios.put(
          `${API_URL}/editArticle/`,
          requestData,
          getAuthHeader()
        );
        return updatedRow;
      } else if (dataChanged && ArticleOuSousArticle === "EditSousArticle") {
        console.log("requestData edit Sous", requestData);

        await axios.put(
          `${API_URL}/editSousArticle/`,
          requestData,
          getAuthHeader()
        );
        return sousArticlesData(), updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return returnTable(
    RowID,
    articles,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    handleCellEditCommit,
    handleCheckBoxChange,
    renderDropdownCell,
    CALLER,
    pieces
  );
};

export default TableEditionArticles;
