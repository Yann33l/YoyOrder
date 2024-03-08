import { DataGrid } from "@mui/x-data-grid";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { dataTableStyle } from "./TableStyle";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "commande_id", "article_id", "reception_id"];

const TableArticlesReception = ({ pieces }) => {
  const [data, setData] = useState([]);
  const handleCheckBoxChange = async (params) => {
    const { id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
    const newValue = !params.row["En totalité ?"];
    const updatedRow = { ...updatedData[rowIndex], "En totalité ?": newValue };
    updatedData[rowIndex] = updatedRow;
    setData(updatedData);

    try {
      let dataChanged = false;
      if (
        params.field === "En totalité ?" &&
        newValue !== data[rowIndex]["En totalité ?"]
      ) {
        dataChanged = true;
      }
      if (dataChanged) {
        const requestData = {
          commandeID: params.row.commande_id,
          editedValue: newValue,
        };
        await axios.put(
          `${API_URL}/editReception/`,
          requestData,
          getAuthHeader()
        );
        await updateData();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesReception/${pieces}`,
        getAuthHeader()
      );
      const responseData = response.data;
      setData(responseData.results);
    } catch (error) {
      console.error(error);
    }
  }, [pieces]);

  const renderCheckCell = (params) => {
    return (
      <input
        type="checkbox"
        checked={params.value || false}
        onChange={() => handleCheckBoxChange(params)}
      />
    );
  };

  useEffect(() => {
    updateData();
  }, [pieces, updateData]);

  // handleCellEditCommit() permet de mettre à jour les données dans la base de données
  const handleCellEditCommit = async (params) => {
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === params.id);
    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setData(updatedData);

    try {
      const requestData = {
        commandeID: updatedData[rowIndex]["commande_id"],
        receptionID: updatedData[rowIndex]["reception_id"],
        editedValue: undefined,
        commentaire: undefined,
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          if (key === "date Reception") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            if (formattedDate !== data[rowIndex][key]) {
              requestData.editedValue = formattedDate;
            }
          } else if (key === "commentaire reception") {
            requestData.commentaire = updatedData[rowIndex][key];
          } else {
            updatedData[rowIndex][key] === ""
              ? (requestData.editedValue = "")
              : (requestData.editedValue = updatedData[rowIndex][key]);
          }
          dataChanged = true;
        }
      }

      if (dataChanged) {
        await axios.put(
          `${API_URL}/editReception/`,
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
      if (label === "date Reception") {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          editable: true,
          headerClassName: "editableHeader",
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "date Commande" || label === "date Demande") {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "commentaire reception") {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          editable: true,
          headerClassName: "editableHeader",
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      } else if (label === "En totalité ?") {
        return {
          field: label,
          headerName: label,
          flex: 0.2,
          headerClassName: "editableHeader",
          renderCell: renderCheckCell,
          editable: true,
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
        };
      }
    });

    return articlesColumns;
  };

  return (
    <DataGrid
      rows={data}
      columns={generateColumns(data)}
      sx={dataTableStyle}
      getRowId={(row) => row.commande_id}
      density="compact"
      getRowHeight={() => "auto"}
      slots={{
        toolbar: CustomToolbar,
      }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

TableArticlesReception.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesReception;
