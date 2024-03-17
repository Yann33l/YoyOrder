import { DataGrid } from "@mui/x-data-grid";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL, updateDataTables } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import {
  dataTableStyle,
  columnGroupingModel,
  generateColumns,
} from "./TableStyle";
import PropTypes from "prop-types";

const TableArticlesReception = ({ pieces }) => {
  const EDITABLE_COLUMNS = [
    "date_Reception",
    "quantité_Reçue",
    "commentaire_Reception",
    "En totalité ?",
  ];
  const IGNORED_FIELDS = ["commande_id", "article_id", "reception_id"];

  const [data, setData] = useState([]);

  const handleCheckBoxChange = async (params) => {
    const { commande_id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex(
      (row) => row.commande_id === commande_id
    );
    const newValue = !params.row["En totalité ?"];
    const updatedRow = { ...updatedData[rowIndex], "En totalité ?": newValue };

    updatedData[rowIndex] = updatedRow;
    setData(updatedData);

    try {
      let dataChanged = false;
      if (params.field === "En totalité ?") {
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
        await updateDataTables(setData, "articlesReception", pieces);
        return updatedRow;
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  useEffect(() => {
    updateDataTables(setData, "articlesReception", pieces);
  }, [pieces]);

  const handleCellEditCommit = async (params) => {
    const { commande_id } = params;

    const updatedData = [...data];
    const rowIndex = updatedData.findIndex(
      (row) => row.commande_id === commande_id
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
        receptionID: updatedData[rowIndex]["reception_id"],
        editedValue: undefined,
        commentaire: undefined,
        quantité: undefined,
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          if (key === "date_Reception") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            if (formattedDate !== data[rowIndex][key]) {
              requestData.editedValue = formattedDate;
            }
          } else if (key === "commentaire_Reception") {
            requestData.commentaire = updatedData[rowIndex][key];
          } else if (
            key === "quantité_Reçue" &&
            updatedData[rowIndex][key] <=
              data[rowIndex]["quantité_En attente"] +
                data[rowIndex]["quantité_Reçue"] &&
            updatedData[rowIndex][key] >= 0
          ) {
            requestData.quantité = updatedData[rowIndex][key];
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
        await updateDataTables(setData, "articlesReception", pieces);
        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  const CALLER = "receptionArticle";

  return (
    <DataGrid
      experimentalFeatures={{ columnGrouping: true }}
      rows={data}
      columns={generateColumns(
        data,
        IGNORED_FIELDS,
        EDITABLE_COLUMNS,
        handleCheckBoxChange,
        null,
        CALLER
      )}
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

TableArticlesReception.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesReception;
