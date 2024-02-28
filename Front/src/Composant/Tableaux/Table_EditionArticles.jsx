import { dataTableStyle } from "./TableStyle";
import { DataGrid } from "@mui/x-data-grid";
import { MenuItem, Select } from "@mui/material";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL, GetFournisseurs } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";

const IGNORED_FIELDS = ["article_id"];

const TableEditionArticles = () => {
  const [articles, setArticles] = useState([]);
  const [gridKey, setGridKey] = useState(0);
  const [fournisseurs, setFournisseurs] = useState([]);

  const renderCheckCell = (params) => {
    return (
      <input
        type="checkbox"
        checked={params.value || false}
        onChange={() => handleCheckBoxChange(params)}
      />
    );
  };

  const fetchFournisseurs = async () => {
    try {
      const fournisseursData = await GetFournisseurs();
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
        setGridKey((prev) => prev + 1);
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

  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];
    const columns = columnsWithoutIgnoredFields.map((key) => {
      if (key === "dateDebutValidite" || key === "dateFinValidite") {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (key === "libelle") {
        return {
          field: key,
          headerName: "nom article",
          flex: 1,
          editable: true,
        };
      } else if (key === "ref" || key === "conditionnement") {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
        };
      } else if (key === "fournisseur") {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
          renderEditCell: renderDropdownCell,
        };
      } else {
        return {
          field: key,
          headerName: key,
          renderCell: renderCheckCell,
          flex: 0.1,
          editable: true,
        };
      }
    });
    return columns;
  };

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
        await updateData();

        setGridKey((prev) => prev + 1); // Change la clé pour créer une nouvelle instance
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return (
    <DataGrid
      key={gridKey}
      rows={articles}
      rowHeight={35}
      columns={generateColumns(articles)}
      sx={dataTableStyle}
      getRowId={(row) => row.article_id}
      density="compact"
      slots={{
        toolbar: CustomToolbar,
      }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

export default TableEditionArticles;
