import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "c.ID"];
const EDITABLE_COLUMNS = ["date Demande", "ACP", "PAM", "GEC", "RC", "BIO"];

const TableArticlesDemande = ({ pieces }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getArticles = async () => {
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
    };

    getArticles();
  }, [pieces]);

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

    // Send a PUT request to update the value in the backend
    try {
      const requestData = {
        commandeID: updatedData[rowIndex]["c.ID"],
      };
      console.log("requestData", requestData);
      try {
        for (const key in updatedData[rowIndex]) {
          if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
            console.log(
              `changedDataOnly: clé ${key}, valeur ${updatedData[rowIndex][key]}`
            );
            requestData[key] = updatedData[rowIndex][key];
          }
        }
        console.log("requestDataUp", requestData);
      } catch (error) {
        console.error(
          "erreur sur fonction de comparaison ancien nouvelle valeurs:",
          error
        );
      }
      await axios.get(`${API_URL}/`, requestData, getAuthHeader());

      // Add your PUT request code here

      await axios.put(`${API_URL}/editDemande/`, requestData, getAuthHeader());
    } catch (error) {
      console.error("Error updating value:", error);
    }
  };

  //generateColumns() permet de générer les colonnes dynamiquement en fonction des données reçues pour ne pas avoir à modifier à chaque changement
  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];

    const articlesColumns = [
      ...columnsWithoutIgnoredFields.map((label) => ({
        field: label,
        headerName: label,
        flex: 1,
        renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        editable: EDITABLE_COLUMNS.includes(label),
        //? correspond à if (params.row[label]) {params.row[label]} else {""}
      })),
    ];
    return articlesColumns;
  };

  const dataTableStyle = {
    height: 700,
    width: "90%",
    margin: "auto",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: "5px",
    boxShadow: "0px 0px 5px 0px rgba(0,0,0,0.75)",
  };

  return (
    <DataGrid
      rows={data}
      columns={generateColumns(data)}
      sx={dataTableStyle}
      getRowId={(row) => row.id}
      slots={{ toolbar: GridToolbar }}
      processRowUpdate={handleCellEditCommit}
      editMode="cell"
    />
  );
};

TableArticlesDemande.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesDemande;
