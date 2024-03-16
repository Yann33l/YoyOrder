import {
  dataTableStyle,
  columnGroupingModel,
  generateColumns,
} from "./TableStyle";
import { DataGrid } from "@mui/x-data-grid";
import { MenuItem, Select } from "@mui/material";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL, GetActiveFournisseurs } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";

const IGNORED_FIELDS = ["article_id"];
const CALLER = "editionArticle";

const TableEditionArticles = () => {
  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [EDITABLE_COLUMNS, setEDITABLE_COLUMNS] = useState([]);

  const fetchFournisseurs = async () => {
    try {
      const fournisseursData = await GetActiveFournisseurs();
      setFournisseurs(fournisseursData);
    } catch (error) {
      console.error("Erreur lors de la récupération des fournisseurs :", error);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

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
        await updateData();
      } else {
        console.log("Aucune modification");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/getArticleForEdit/`,
        getAuthHeader()
      );
      const responseData = response.data;
      setArticles(responseData.results);
      setEDITABLE_COLUMNS(Object.keys(responseData.results[0]));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    updateData();
  }, [updateData]);

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
    const rowIndex = updatedData.findIndex(
      (row) => row.article_id === article_id
    );

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setArticles(updatedData);

    try {
      const requestData = {
        articleID: updatedData[rowIndex]["article_id"],
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
        } else if (key === "fournisseur") {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            const fournisseurLabelChanged = updatedData[rowIndex][key];
            for (const fournisseur of fournisseurs) {
              if (fournisseur.libelle === fournisseurLabelChanged) {
                requestData["fournisseur_id"] = fournisseur.ID;
              }
            }
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData[key] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }

      if (dataChanged) {
        console.log("requestData", requestData);
        await axios.put(
          `${API_URL}/editArticle/`,
          requestData,
          getAuthHeader()
        );
        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return (
    <DataGrid
      experimentalFeatures={{ columnGrouping: true }}
      rows={articles}
      columns={generateColumns(
        articles,
        IGNORED_FIELDS,
        EDITABLE_COLUMNS,
        handleCheckBoxChange,
        renderDropdownCell,
        CALLER
      )}
      sx={dataTableStyle}
      getRowId={(row) => row.article_id}
      density="compact"
      getRowHeight={() => "auto"}
      slots={{
        toolbar: CustomToolbar,
      }}
      processRowUpdate={handleCellEditCommit}
      columnGroupingModel={columnGroupingModel}
    />
  );
};

export default TableEditionArticles;
