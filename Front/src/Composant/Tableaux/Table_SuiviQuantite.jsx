import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { API_URL, getDataForTables, uploadCOA } from "../API/api";
import { getAuthHeader } from "../API/token";
import { returnTable } from "./TableStyle";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "stock_id", "reception_id"];
const RowID = "id";
const EDITABLE_COLUMNS = [
  "quantité_ReceptionRestante",
  "date_FinUtilisation",
  "date_DebutUtilisation",
  "COA",
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
          articlesEnStock(pieces);
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
    null,
    null,
    null,
    null,
    null,
    null,
    handleFileChange
  );
};

TableArticlesEnStock.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesEnStock;
