import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { dataTableStyle } from "./TableStyle";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "commande_id", "article_id", "date Commande"];

const TableArticlesDemande = ({ pieces }) => {
  const [data, setData] = useState([]);
  const [gridKey, setGridKey] = useState(0);
  const [editableColumns, setEditableColumns] = useState([]);

  useEffect(() => {
    const fetchEditableColumns = async () => {
      try {
        const response = await axios.get(`${API_URL}/secteur_labels/`);
        const responseData = response.data;
        setEditableColumns(responseData);
      } catch (error) {
        console.error(error);
      }
    };
    fetchEditableColumns();
  }, []);

  const EDITABLE_COLUMNS = ["date Demande", ...editableColumns];
  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesDemande/${pieces}`,
        getAuthHeader()
      );
      const responseData = response.data;
      const dataWithIds = responseData.results.map((row, index) => ({
        ...row,
        id: index + 1,
      }));
      setData(dataWithIds);
    } catch (error) {
      console.error(error);
    }
  }, [pieces]);

  useEffect(() => {
    updateData();
  }, [pieces, updateData]);

  // handleCellEditCommit() permet de mettre à jour les données dans la base de données
  const handleCellEditCommit = async (params) => {
    const { id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      if (key !== "id") {
        updatedRow[key] = params[key];
      }
    }
    updatedData[rowIndex] = updatedRow;
    setData(updatedData);

    try {
      const requestData = {
        commandeID: updatedData[rowIndex]["commande_id"],
        articleID: updatedData[rowIndex]["article_id"],
        editedValue: undefined,
      };
      let dataChanged = false;
      let changedKey = null;

      for (const key in updatedData[rowIndex]) {
        if (key === "date Demande") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== data[rowIndex][key]) {
            requestData.editedValue = formattedDate;
            dataChanged = true;
            changedKey = key;
          }
        } else {
          if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData.editedValue = 0)
              : (requestData.editedValue = updatedData[rowIndex][key]);
            dataChanged = true;
            changedKey = key;
          }
        }
      }

      if (dataChanged) {
        await axios.put(
          `${API_URL}/editDemande/${changedKey}`,
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

  //generateColumns() permet de générer les colonnes dynamiquement en fonction des données reçues pour ne pas avoir à modifier à chaque changement
  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];

    const articlesColumns = columnsWithoutIgnoredFields.map((label) => {
      if (label === "date Demande") {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          editable: EDITABLE_COLUMNS.includes(label),
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "date Commande") {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "nom article") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      } else if (label === "fournisseur") {
        return {
          field: label,
          headerName: label,
          flex: 0.2,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      } else {
        return {
          field: label,
          headerName: label,
          flex: 0.2,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
        };
      }
    });
    return articlesColumns;
  };

  return (
    <DataGrid
      autoHeight
      {...data}
      key={gridKey}
      rows={data}
      rowHeight={35}
      columns={generateColumns(data)}
      sx={dataTableStyle}
      getRowId={(row) => row.id}
      slots={{ toolbar: GridToolbar }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

TableArticlesDemande.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesDemande;
