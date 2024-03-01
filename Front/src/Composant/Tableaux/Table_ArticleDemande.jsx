import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { dataTableStyle } from "./TableStyle";
import CustomToolbar from "./CustomToolBar";
import PropTypes from "prop-types";

const IGNORED_FIELDS = [
  "commande_id",
  "article_id",
  "date Commande",
  "numero IBF",
];

const TableArticlesDemande = ({ pieces }) => {
  const [data, setData] = useState([]);
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

  const EDITABLE_COLUMNS = ["date Demande", "commentaire", ...editableColumns];
  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesDemande/${pieces}`,
        getAuthHeader()
      );
      const responseData = response.data;
      setData(responseData.results);
    } catch (error) {
      console.error(error);
    }
  }, [pieces]);

  useEffect(() => {
    updateData();
  }, [pieces, updateData]);

  // handleCellEditCommit() permet de mettre à jour les données dans la base de données
  const handleCellEditCommit = async (params) => {
    const { article_id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex(
      (row) => row.article_id === article_id
    );

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setData(updatedData);

    try {
      const requestData = {
        commandeID: updatedData[rowIndex]["commande_id"],
        articleID: updatedData[rowIndex]["article_id"],
        editedValue: undefined,
        commentaire: undefined,
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
        } else if (key === "commentaire") {
          if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
            requestData.commentaire = updatedData[rowIndex][key];
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
        return updatedRow;
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
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          flex: 0.3,
          editable: EDITABLE_COLUMNS.includes(label),
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (
        label === "commentaire" ||
        label === "fournisseur" ||
        label === "quantité" ||
        label === "conditionnement" ||
        label === "ref"
      ) {
        return {
          field: label,
          headerName: label,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          flex: 0.3,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
        };
      } else if (label === "nom article") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      } else {
        return {
          field: label,
          headerName: label,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          flex: 0.1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
        };
      }
    });
    return articlesColumns;
  };

  return (
    <DataGrid
      rows={data}
      rowHeight={35}
      columns={generateColumns(data)}
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

TableArticlesDemande.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesDemande;
