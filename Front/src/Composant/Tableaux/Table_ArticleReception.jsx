import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";
import { dataTableStyle } from "./TableStyle";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "commande_id", "article_id"];
const EDITABLE_COLUMNS = ["Date Reception", "En totalité ?"];

const TableArticlesReception = ({ pieces }) => {
  const [data, setData] = useState([]);
  const [gridKey, setGridKey] = useState(0);

  const handleCheckBoxChange = async (params) => {
    const { id } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.id === id);
    const newValue = !params.row["En totalité ?"]; // Invert the value
    const updatedRow = { ...updatedData[rowIndex], "En totalité ?": newValue };
    updatedData[rowIndex] = updatedRow;
    setData(updatedData);

    try {
      let dataChanged = false;
      if (
        params.field === "En totalité ?" &&
        newValue !== data[rowIndex]["En totalité ?"]
      ) {
        dataChanged = true;
      }
      if (dataChanged) {
        const requestData = {
          commandeID: params.row.commande_id,
          editedValue: newValue,
        };
        console.log(requestData);
        await axios.put(
          `${API_URL}/editReception/`,
          requestData,
          getAuthHeader()
        );
        await updateData();
        setGridKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/articlesReception/${pieces}`,
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
  }, [pieces]);

  const renderCheckCell = (params) => {
    console.log(params);
    return (
      <input
        type="checkbox"
        checked={params.row["En totalité ?"] || false}
        onChange={() => handleCheckBoxChange(params)}
      />
    );
  };
  useEffect(() => {
    updateData();
  }, [pieces, updateData]);

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
        editedValue: undefined,
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (key === "date Reception") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== data[rowIndex][key]) {
            requestData.editedValue = formattedDate;
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData.editedValue = 0)
              : (requestData.editedValue = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }

      if (dataChanged) {
        await axios.put(
          `${API_URL}/editReception/`,
          requestData,
          getAuthHeader()
        );
        await updateData();

        setGridKey((prev) => prev + 1); // Change la clé pour créer une nouvelle instance
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

    const articlesColumns = columnsWithoutIgnoredFields.map((label) => {
      if (label === "date Reception") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          editable: true,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "date Commande" || label === "date Demande") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),

          type: "date",
        };
      } else if (label === "En totalité ?") {
        return {
          field: label,
          headerName: label,
          flex: 1,
          renderCell: renderCheckCell,
          editable: true,
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
    // flatten() permet de transformer un tableau de tableaux en un tableau unidimensionnel
    const flattenedColumns = articlesColumns.flat();
    return flattenedColumns;
  };

  return (
    <DataGrid
      autoHeight
      {...data}
      key={gridKey}
      rows={data}
      columns={generateColumns(data)}
      sx={dataTableStyle}
      rowHeight={35}
      getRowId={(row) => row.id}
      slots={{ toolbar: GridToolbar }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

TableArticlesReception.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticlesReception;
