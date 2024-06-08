import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL, getDataForTables, uploadCOA } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { returnTable } from "./TableStyle";

import PropTypes from "prop-types";

const TableArticlesReception = ({ pieces }) => {
  const EDITABLE_COLUMNS = [
    "date_Réception",
    "quantité_Reçue",
    "commentaire_Reception",
    "En totalité ?",
    "COA",
    "date_Péremption",
    "Lot",
  ];
  const IGNORED_FIELDS = [
    "commande_id",
    "article_id",
    "reception_id",
    "id",
    "sous_article_id",
    "sous_commande_id",
    "stock_id",
  ];
  const CALLER = "receptionArticle";
  const RowID = "id";
  const [data, setData] = useState([]);
  const articlesReceptionData = async (pieces) => {
    const responseData = await getDataForTables(
      setData,
      "articlesReception",
      pieces
    );
    const dataWithIds = responseData.results.map((row, index) => ({
      ...row,
      id: index,
    }));
    setData(dataWithIds);
  };

  useEffect(() => {
    (async () => {
      articlesReceptionData(pieces);
    })();
  }, [pieces]);

  const handleCheckBoxChange = async (params) => {
    const { id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
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
          sousCommandeID: updatedData[rowIndex]["sous_commande_id"],
          editedValue: newValue,
        };
        await axios.put(
          `${API_URL}/editReception/`,
          requestData,
          getAuthHeader()
        );
        return articlesReceptionData(pieces);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  const handleCellEditCommit = async (params) => {
    const { id } = params;

    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
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
        sousCommandeID: updatedData[rowIndex]["sous_commande_id"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          if (key === "date_Réception" || key === "date_Péremption") {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            requestData[key] = formattedDate;
          } else if (
            key === "quantité_Reçue" &&
            updatedData[rowIndex][key] <=
              data[rowIndex]["quantité_En attente"] +
                data[rowIndex]["quantité_Reçue"] &&
            updatedData[rowIndex][key] >= 0
          ) {
            requestData[key] = updatedData[rowIndex][key];
          } else if (key !== "id" && key !== "quantité_Reçue") {
            requestData[key] = updatedData[rowIndex][key];
          }
          dataChanged = true;
        }
      }

      if (dataChanged) {
        for (const key in requestData) {
          if (requestData[key] === undefined) {
            delete requestData[key];
          }
        }
        console.log(requestData);
        await axios.put(
          `${API_URL}/editReception/`,
          requestData,
          getAuthHeader()
        );
        await articlesReceptionData(pieces);
        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  const handleFileChange = async (params, file, droped) => {
    let dataChanged = false;
    const { id } = params;
    console.log("params", params);
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);

    if (file === null || droped === true) {
      dataChanged = true;
      updatedData[rowIndex]["COA"] = null;
      setData(updatedData);
    } else {
      const fileToBase64 = async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };
      const base64String = await fileToBase64(file);

      const requestData = {
        stockID: updatedData[rowIndex]["stock_id"],
        lot: updatedData[rowIndex]["Lot"],
        COA: base64String,
      };
      dataChanged = true;

      if (dataChanged) {
        try {
          const fileUrl = URL.createObjectURL(file);
          setTimeout(() => {
            window.open(fileUrl, "_blank");
          }, 100);
          await uploadCOA(requestData);
          articlesReceptionData(pieces);
        } catch (error) {
          console.error(
            "erreur sur l'api lors de l'édition des valeurs:",
            error
          );
        }
      }
    }
  };

  return returnTable(
    RowID,
    data,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    handleCellEditCommit,
    handleCheckBoxChange,
    null,
    CALLER,
    null,
    null,
    null,
    handleFileChange
  );
};

TableArticlesReception.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesReception;
