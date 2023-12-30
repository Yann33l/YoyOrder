import { useEffect, useState } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

const IGNORED_FIELDS = ["id", "a.ID"];
const EDITABLE_COLUMNS = ["ref", "date Commande"];

const TableArticlesCommande = () => {
  const [data, setData] = useState([]);
  const authHeader = getAuthHeader();

  useEffect(() => {
    const getArticles = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/articlesCommande/`,
          authHeader
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
  }, [authHeader]);

  const handleCellEditCommit = async (params) => {
    console.log("params", params);
    // Extract the updated value and other necessary information from params
    const { id, value } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
    updatedData[rowIndex] = { ...updatedData[rowIndex] };

    // Send a PUT request to update the value in the backend
    try {
      console.log("field", value);
      /* await axios.put(
          `${API_URL}/updateArticleValue/${id}`,
          { [field]: value },
          authHeader
        );*/
    } catch (error) {
      console.error("Error updating value:", error);
    }
  };

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

export default TableArticlesCommande;
