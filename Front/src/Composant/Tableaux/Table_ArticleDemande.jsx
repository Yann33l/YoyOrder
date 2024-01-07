import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "commande_id", "article_id"];
const EDITABLE_COLUMNS = ["date Demande", "ACP", "PAM", "GEC", "RC", "BIO"];

const TableArticlesDemande = ({ pieces }) => {
  const [data, setData] = useState([]);
  const [gridKey, setGridKey] = useState(0);

  const updateData = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesDemande/${pieces}`,
        getAuthHeader()
      );
      const responseData = response.data;
      const dataWithIds = responseData.results.map((row, index) => ({
        ...row,
        id: index + 1,
      }));
      setData(dataWithIds);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    const getArticles = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/articlesDemande/${pieces}`,
          getAuthHeader()
        );
        const responseData = response.data;
        const dataWithIds = responseData.results.map((row, index) => ({
          ...row,
          id: index + 1,
        }));
        setData(dataWithIds);
      } catch (error) {
        console.error(error);
      }
    };

    getArticles();
  }, [pieces]);

  // handleCellEditCommit() permet de mettre à jour les données dans la base de données
  const handleCellEditCommit = async (params) => {
    const { id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      if (key !== "id") {
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
      };
      let dataChanged = false;
      let changedKey = null;

      for (const key in updatedData[rowIndex]) {
        if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
          console.log("requestData", requestData);
          console.log(
            `changedDataOnly: clé ${key}, valeur ${updatedData[rowIndex][key]}`
          );

          // Appliquer le formateur uniquement si la colonne est "date Demande"
          if (key === "date Demande") {
            /*  requestData.editedValue = new Date(
              updatedData[rowIndex]["date Demande"]
            ).toISOString();*/

            const dateObj = new Date(updatedData[rowIndex][key]);
            const formattedDate = `${dateObj
              .getFullYear()
              .toString()
              .padStart(2, "0")}-${(dateObj.getMonth() + 1)
              .toString()
              .padStart(2, "0")}-${dateObj
              .getDate()
              .toString()
              .padStart(2, "0")}`;
            requestData.editedValue = formattedDate;
          } else {
            requestData.editedValue = updatedData[rowIndex][key];
          }

          console.log("requestDataUp", requestData);

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

        setGridKey((prev) => prev + 1); // Changez la clé pour créer une nouvelle instance
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  //generateColumns() permet de générer les colonnes dynamiquement en fonction des données reçues pour ne pas avoir à modifier à chaque changement
  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];
    const dateFormatter = (params) => {
      if (params.value) {
        const date = new Date(params.value);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Les mois commencent à 0
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return "";
    };
    const articlesColumns = columnsWithoutIgnoredFields.map((label) => {
      if (label === "date Demande") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
          type: "date",
          valueFormatter: dateFormatter,
        };
      } else {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
          editable: EDITABLE_COLUMNS.includes(label),
        };
      }
    });
    return articlesColumns;
  };

  const dataTableStyle = {
    height: 700,
    width: "90%",
    margin: "auto",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: "5px",
    boxShadow: "0px 0px 5px 0px rgba(0,0,0,0.75)",
  };

  return (
    console.log("data", data),
    (
      <DataGrid
        key={gridKey}
        rows={data}
        columns={generateColumns(data)}
        sx={dataTableStyle}
        getRowId={(row) => row.id}
        slots={{ toolbar: GridToolbar }}
        processRowUpdate={handleCellEditCommit}
      />
    )
  );
};

TableArticlesDemande.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesDemande;
