import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import {
  dataTableStyle,
  columnGroupingModel,
  generateColumns,
} from "./TableStyle";
import CustomToolbar from "./CustomToolBar";
import PropTypes from "prop-types";

const IGNORED_FIELDS = ["commande_id", "article_id"];

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

  const EDITABLE_COLUMNS = [
    "date_Demande",
    "commentaire_Demande",
    ...editableColumns,
  ];

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
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          if (key === "date_Demande") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            requestData.editedValue = formattedDate;
          } else if (key === "commentaire_Demande") {
            requestData.commentaire = updatedData[rowIndex][key];
          } else {
            updatedData[rowIndex][key] === ""
              ? (requestData.editedValue = 0)
              : (requestData.editedValue = updatedData[rowIndex][key]);
          }
          dataChanged = true;
          changedKey = key;
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

  return (
    <DataGrid
      experimentalFeatures={{ columnGrouping: true }}
      rows={data}
      columns={generateColumns(data, IGNORED_FIELDS, EDITABLE_COLUMNS)}
      sx={dataTableStyle}
      getRowId={(row) => row.article_id}
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

TableArticlesDemande.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesDemande;
