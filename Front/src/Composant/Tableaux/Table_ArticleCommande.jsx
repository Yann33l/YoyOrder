import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { dataTableStyle } from "./TableStyle";
import CustomToolbar from "./CustomToolBar";
const IGNORED_FIELDS = ["commande_id", "article_id"];
const EDITABLE_COLUMNS = ["date Commande", "numero IBF"];

const TableArticlesCommande = () => {
  const [data, setData] = useState([]);
  const updateData = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesCommande/`,
        getAuthHeader()
      );
      const responseData = response.data;
      setData(responseData.results);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    updateData();
  }, []);

  const handleCellEditCommit = async (params) => {
    const { commande_id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex(
      (row) => row.commande_id === commande_id
    );
    const updatedRow = { ...updatedData[rowIndex] };

    for (const key in params) {
      if (params[key] !== updatedData[rowIndex][key]) {
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
        commentaire: undefined,
      };
      let dataChanged = false; // Variable pour suivre si les données ont changé

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          if (key === "date Commande") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            requestData.editedValue = formattedDate;
          } else if (key === "numero IBF") {
            requestData.commentaire = updatedData[rowIndex][key];
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
        return updatedRow;
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
          flex: 0.3,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          editable: EDITABLE_COLUMNS.includes(label),
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "date Demande") {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          valueFormatter: (params) =>
            params.value ? dayjs(params.value).format("DD/MM/YYYY") : "",
          type: "date",
        };
      } else if (
        label === "ref" ||
        label === "fournisseur" ||
        label === "quantité" ||
        label === "conditionnement" ||
        label === "commentaire" ||
        label === "numero IBF"
      ) {
        return {
          field: label,
          headerName: label,
          flex: 0.3,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          editable: EDITABLE_COLUMNS.includes(label),
        };
      } else if (label === "nom article") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
        };
      } else {
        return {
          field: label,
          headerName: label,
          flex: 0.1,
          headerClassName: EDITABLE_COLUMNS.includes(label)
            ? "editableHeader"
            : "",
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

export default TableArticlesCommande;
