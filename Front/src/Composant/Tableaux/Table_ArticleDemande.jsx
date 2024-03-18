import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL, getDataForTables } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { returnTable } from "./TableStyle";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["commande_id", "article_id"];

const TableArticlesDemande = ({ pieces }) => {
  const [data, setData] = useState([]);
  const [editableColumns, setEditableColumns] = useState([]);
  const RowID = "article_id";

  useEffect(() => {
    getDataForTables(setEditableColumns, "secteur_labels");
  }, []);

  const EDITABLE_COLUMNS = [
    "date_Demande",
    "commentaire_Demande",
    ...editableColumns,
  ];

  useEffect(() => {
    getDataForTables(setData, "articlesDemande", pieces);
  }, [pieces]);

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
        await getDataForTables(setData, "articlesDemande", pieces);
        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return returnTable(
    RowID,
    data,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    handleCellEditCommit
  );
};

TableArticlesDemande.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesDemande;
