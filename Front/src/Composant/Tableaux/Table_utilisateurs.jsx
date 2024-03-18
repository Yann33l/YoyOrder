import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { API_URL, GetSecteurs } from "../API/api";
import { getAuthHeader } from "../API/token";
import { returnTable } from "./TableStyle";

const IGNORED_FIELDS = ["user_id", "id"];
const STATUS_FIELDS = [
  "Admin",
  "Demandeur",
  "Acheteur",
  "Autorisation",
  "Editeur",
];
const RowID = "id";
const CALLER = "UserAdmin";

const TableUtilisateurs = () => {
  const [data, setData] = useState([]);
  const [secteurs, setSecteurs] = useState([]);
  const [EDITABLE_COLUMNS, setEDITABLE_COLUMNS] = useState([]);

  const getUtilisateurs = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/users/`, getAuthHeader());
      const responseData = response.data;
      if (responseData.results && responseData.results.length > 0) {
        const dataWithIds = responseData.results.map((row, index) => ({
          ...row,
          id: index + 1,
          ...STATUS_FIELDS.reduce((acc, field) => {
            acc[field] = row[field] || false;
            return acc;
          }, {}),
        }));
        setData(dataWithIds);
        setEDITABLE_COLUMNS(
          Object.keys(responseData.results[0]).filter(
            (key) => !IGNORED_FIELDS.includes(key) && key !== "Email"
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleCheckBoxChange = useCallback(async (params) => {
    const newValue = !params.row[params.field];
    try {
      let requestData;
      if (STATUS_FIELDS.includes(params.field)) {
        requestData = {
          Email: params.row.Email,
          Status: newValue,
        };
      } else if (!IGNORED_FIELDS.includes(params.field)) {
        requestData = {
          user_id: params.row.user_id,
          secteur_libelle: params.field,
        };
      }
      if (requestData) {
        await axios.put(
          `${API_URL}/editUser${
            STATUS_FIELDS.includes(params.field) ? "Status" : "Secteur"
          }/${STATUS_FIELDS.includes(params.field) ? params.field : ""}`,
          requestData,
          getAuthHeader()
        );
        setData((prevData) => {
          const updatedData = [...prevData];
          const rowIndex = updatedData.findIndex(
            (row) => row.Email === params.row.Email
          );
          if (rowIndex !== -1) {
            updatedData[rowIndex] = {
              ...updatedData[rowIndex],
              [params.field]: newValue,
            };
          }
          return updatedData;
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setSecteurs(await GetSecteurs());
    })();
  }, []);

  useEffect(() => {
    getUtilisateurs();
  }, [getUtilisateurs]);

  return returnTable(
    RowID,
    data,
    IGNORED_FIELDS,
    EDITABLE_COLUMNS,
    null,
    handleCheckBoxChange,
    null,
    CALLER,
    null,
    secteurs
  );
};

export default TableUtilisateurs;
