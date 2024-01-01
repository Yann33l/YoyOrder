import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "c.ID"];
const EDITABLE_COLUMNS = ["date Demande", "ACP", "PAM", "GEC", "RC"];

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
        const datawithIds = responseData.results.map((row, index) => ({
          ...row,
          id: index + 1,
        }));
        setData(datawithIds);
      } catch (error) {
        console.error(error);
      }
    };

    getArticles();
  }, [pieces]);

  const handleCellEditCommit = async (params) => {
    // Extract the updated value and other necessary information from params
    const { id, value } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
    {
      updatedData[rowIndex] = { ...updatedData[rowIndex], [params]: value };
      setData(updatedData);
      console.log("params", params);

      // Send a PUT request to update the value in the backend
      try {
        const requestData = {
          date_Demande: params["date Demande"],
          ACP: params.ACP,
          PAM: params.PAM,
          GEC: params.GEC,
          RC: params.RC,
          quantite: params.quantité,
          article_id: params["a.ID"],
        };
        console.log("requestData", requestData);
        await axios.get(`${API_URL}/`, requestData, getAuthHeader());

        // Add your PUT request code here

        await axios.put(
          `${API_URL}/editDemande/`,
          requestData,
          getAuthHeader()
        );
        setData(updatedData);
      } catch (error) {
        console.error("Error updating value:", error);
      }
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
