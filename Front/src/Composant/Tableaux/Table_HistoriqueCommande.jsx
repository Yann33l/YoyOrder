import { DataGrid } from "@mui/x-data-grid";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import { dataTableStyle } from "./TableStyle";

const IGNORED_FIELDS = ["id", "commande_id", "article_id"];

const TableArticlesReception = () => {
  const [data, setData] = useState([]);

  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/historiqueReception/`,
        getAuthHeader()
      );
      const responseData = response.data;
      const dataWithIds = responseData.results.map((row, index) => ({
        ...row,
        id: index,
      }));
      setData(dataWithIds);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    updateData();
  }, [updateData]);

  const renderCheckCell = (params) => {
    return <input type="checkbox" checked={params.value || false} readOnly />;
  };
  //generateColumns() permet de générer les colonnes dynamiquement en fonction des données reçues pour ne pas avoir à modifier à chaque changement
  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];

    const articlesColumns = columnsWithoutIgnoredFields.map((label) => {
      if (
        label === "date Commande" ||
        label === "date Demande" ||
        label === "date Reception"
      ) {
        return {
          field: label,
          headerName: label,
          width: 130,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (label === "En totalité ?") {
        return {
          field: label,
          headerName: label,
          renderCell: renderCheckCell,
        };
      } else if (label === "nom article") {
        return {
          field: label,
          headerName: label,
          width: 400,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      } else if (
        [
          "commentaire",
          "numero IBF",
          "quantité",
          "conditionnement",
          "ref",
          "fournisseur",
        ].includes(label)
      ) {
        return {
          field: label,
          headerName: label,
          width: 100,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      } else {
        return {
          field: label,
          headerName: label,
          width: 40,
          renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        };
      }
    });

    return articlesColumns;
  };

  return (
    <DataGrid
      rows={data}
      columns={generateColumns(data)}
      sx={dataTableStyle}
      rowHeight={30}
      getRowId={(row) => row.id}
      density="compact"
      slots={{
        toolbar: CustomToolbar,
      }}
    />
  );
};

export default TableArticlesReception;
