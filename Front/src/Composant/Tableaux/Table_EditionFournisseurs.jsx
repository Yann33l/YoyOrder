import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL, GetFournisseurs } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { returnTable } from "./TableStyle";

const IGNORED_FIELDS = ["ID"];
const EDITABLE_COLUMNS = [
  "libelle",
  "dateDebutValidite",
  "dateFinValidite",
  "telephone",
  "email",
  "siteWeb",
  "getCertificatAnalyse",
];
const RowID = "ID";

const TableEditionFournisseurs = () => {
  const [fournisseurs, setFournisseurs] = useState([]);

  useEffect(() => {
    (async () => {
      setFournisseurs(await GetFournisseurs());
    })();
  }, []);

  const handleCellEditCommit = async (params) => {
    const { ID } = params;
    const updatedData = [...fournisseurs];
    const rowIndex = updatedData.findIndex((row) => row.ID === ID);

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setFournisseurs(updatedData);

    try {
      const requestData = {
        ID: updatedData[rowIndex]["ID"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (key === "dateDebutValidite" || key === "dateFinValidite") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== fournisseurs[rowIndex][key]) {
            requestData[key] = formattedDate;
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== fournisseurs[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData[key] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }

      if (dataChanged) {
        await axios.put(
          `${API_URL}/editFournisseur/`,
          requestData,
          getAuthHeader()
        );
        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return returnTable(
    RowID,
    fournisseurs,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    handleCellEditCommit
  );
};

export default TableEditionFournisseurs;
