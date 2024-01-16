import { useEffect, useState } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { dataTableStyle } from "./TableStyle";

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
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
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
          editable: EDITABLE_COLUMNS.includes(label),
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "date Demande") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          valueFormatter: (params) =>
            params.value ? dayjs(params.value).format("DD/MM/YYYY") : "",
          type: "date",
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

export default TableArticlesCommande;
