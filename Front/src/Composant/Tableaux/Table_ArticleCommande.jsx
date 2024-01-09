import { useEffect, useState } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

const IGNORED_FIELDS = ["id", "commande_id", "article_id"];
const EDITABLE_COLUMNS = ["date Commande"];

const TableArticlesCommande = () => {
  const [data, setData] = useState([]);
  const [gridKey, setGridKey] = useState(0);

  const updateData = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesCommande/`,
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

  useEffect(() => {
    const getArticles = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/articlesCommande/`,
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
  }, []);

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
        editedValue: undefined,
      };
      let dataChanged = false; // Variable pour suivre si les données ont changé

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          console.log("requestData", requestData);

          if (key === "date Commande") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = `${dateObj
              .getFullYear()
              .toString()
              .padStart(2, "0")}-${(dateObj.getMonth() + 1)
              .toString()
              .padStart(2, "0")}-${dateObj
              .getDate()
              .toString()
              .padStart(2, "0")}`;
            requestData.editedValue = formattedDate;
          } else
            updatedData[rowIndex][key] === ""
              ? (requestData.editedValue = 0)
              : (requestData.editedValue = updatedData[rowIndex][key]);
          dataChanged = true; // Marquer que les données ont changé
        }
      }

      // Vérifier si les données ont changé avant d'effectuer les appels Axios
      if (dataChanged) {
        await axios.put(
          `${API_URL}/editCommande/`,
          requestData,
          getAuthHeader()
        );
        await updateData();
        setGridKey((prevKey) => prevKey + 1);
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };
  const dateFormatter = (params) => {
    if (params.value) {
      const date = new Date(params.value);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Les mois commencent à 0
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return "";
  };
  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];

    const articlesColumns = columnsWithoutIgnoredFields.map((label) => {
      if (label === "date Commande") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
          type: "date",
          valueFormatter: dateFormatter,
        };
      } else {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
        };
      }
    });

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
      key={gridKey}
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
