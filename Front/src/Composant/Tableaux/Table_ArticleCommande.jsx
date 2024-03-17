import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { API_URL, updateDataTables } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import {
  dataTableStyle,
  columnGroupingModel,
  generateColumns,
} from "./TableStyle";
import CustomToolbar from "./CustomToolBar";
const IGNORED_FIELDS = ["commande_id", "article_id"];
const EDITABLE_COLUMNS = ["date_Commande", "commentaire_Commande"];

const TableArticlesCommande = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    updateDataTables(setData, "articlesCommande");
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
          if (key === "date_Commande") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            requestData.editedValue = formattedDate;
          } else if (key === "commentaire_Commande") {
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
        await updateDataTables(setData, "articlesCommande");

        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return (
    <DataGrid
      experimentalFeatures={{ columnGrouping: true }}
      rows={data}
      columns={generateColumns(data, IGNORED_FIELDS, EDITABLE_COLUMNS)}
      sx={dataTableStyle}
      getRowId={(row) => row.commande_id}
      density="compact"
      getRowHeight={() => "auto"}
      slots={{
        toolbar: CustomToolbar,
      }}
      processRowUpdate={handleCellEditCommit}
      columnGroupingModel={columnGroupingModel}
    />
  );
};

export default TableArticlesCommande;
