import { useCallback, useEffect, useState } from "react";
import { getDataForTables, uploadCOA } from "../API/api";
import { returnTable } from "./TableStyle";

const IGNORED_FIELDS = [
  "id",
  "article_id",
  "sous_article_id",
  "commande_id",
  "sous_commande_id",
  "reception_id",
  "stock_id",
];
const EDITABLE_COLUMNS = [];
const RowID = "id";
const CALLER = "historiqueStock";

const TableHistoriqueStock = () => {
  const [data, setData] = useState([]);

  const updateData = useCallback(async () => {
    try {
      const responseData = await getDataForTables(setData, CALLER);
      const dataWithIds = responseData.results.map((row, index) => ({
        ...row,
        id: index,
      }));
      setData(dataWithIds);
    } catch (error) {
      console.error(error);
    }
  }, []);
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
          updateData();
        } catch (error) {
          console.error(
            "erreur sur l'api lors de l'édition des valeurs:",
            error
          );
        }
      }
    }
  };

  useEffect(() => {
    updateData();
  }, [updateData]);

  return returnTable(
    RowID,
    data,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    null,
    null,
    null,
    CALLER,
    null,
    null,
    null,
    handleFileChange
  );
};

export default TableHistoriqueStock;
