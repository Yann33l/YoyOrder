import { returnTable } from "./TableStyle";
import { getDataForTables } from "../API/api";
import { useEffect, useState } from "react";
import { getAuthHeader } from "../API/token";
import axios from "axios";
import { API_URL } from "../API/api";
import dayjs from "dayjs";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "stock_id"];
const RowID = "id";
const EDITABLE_COLUMNS = [
  "quantité_ReceptionRestante",
  "date_FinUtilisation",
  "date_DebutUtilisation",
];

const TableArticlesEnStock = ({ pieces }) => {
  const [data, setData] = useState([]);
  const articlesEnStock = async (pieces) => {
    const responseData = await getDataForTables(setData, "stock", pieces);
    const dataWithIds = responseData.map((row, index) => ({
      ...row,
      id: index,
    }));
    setData(dataWithIds);
  };

  useEffect(() => {
    (async () => {
      articlesEnStock(pieces);
    })();
  }, [pieces]);

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
        stockID: updatedData[rowIndex]["stock_id"],
        receptionID: updatedData[rowIndex]["recaption_id"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          if (
            key === "date_FinUtilisation" ||
            key === "date_DebutUtilisation"
          ) {
            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
            requestData[key] = formattedDate;
          } else if (
            key === "quantité_ReceptionRestante" &&
            parseInt(updatedData[rowIndex][key]) !== data[rowIndex][key] &&
            parseInt(updatedData[rowIndex][key]) <=
              data[rowIndex]["quantité_Reçue"] &&
            parseInt(updatedData[rowIndex][key]) >= 0
          ) {
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
        console.log("requestData", requestData);
        if (requestData["quantité_ReceptionRestante"]) {
          await axios.put(
            `${API_URL}/editStockQuantite/`,
            requestData,
            getAuthHeader()
          );
        } else {
          await axios.put(
            `${API_URL}/editStockDate/`,
            requestData,
            getAuthHeader()
          );
        }
        await articlesEnStock(pieces);
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

TableArticlesEnStock.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesEnStock;
