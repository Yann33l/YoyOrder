import { dataTableStyle } from "./TableStyle";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL, GetFournisseurs } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";

const IGNORED_FIELDS = ["ID"];

const TableEditionFournisseurs = () => {
  const [gridKey, setGridKey] = useState(0);
  const [fournisseurs, setFournisseurs] = useState([]);

  const fetchFournisseurs = useCallback(async () => {
    try {
      const fournisseursData = await GetFournisseurs();
      setFournisseurs(fournisseursData);
    } catch (error) {
      console.error("Erreur lors de la récupération des fournisseurs :", error);
    }
  }, []);

  useEffect(() => {
    fetchFournisseurs();
  }, [fetchFournisseurs]);

  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];
    const columns = columnsWithoutIgnoredFields.map((key) => {
      if (key === "dateDebutValidite" || key === "dateFinValidite") {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (key === "fournisseur") {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
        };
      } else if (
        key === "telephone" ||
        key === "email" ||
        key === "siteWeb" ||
        key === "getCertificatAnalyse"
      ) {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
        };
      }
      return {
        field: key,
        headerName: key,
        flex: 0.3,
        editable: true,
      };
    });
    return columns;
  };

  const handleCellEditCommit = async (params) => {
    const { fournisseur_id } = params;
    const updatedData = [...fournisseurs];
    const rowIndex = updatedData.findIndex(
      (row) => row.fournisseur_id === fournisseur_id
    );

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
        console.log("requestData", requestData);
        await axios.put(
          `${API_URL}/editFournisseur/`,
          requestData,
          getAuthHeader()
        );
        await fetchFournisseurs();

        setGridKey((prev) => prev + 1); // Change la clé pour créer une nouvelle instance
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return (
    <DataGrid
      autoHeight
      key={gridKey}
      {...fournisseurs}
      rows={fournisseurs}
      rowHeight={35}
      columns={generateColumns(fournisseurs)}
      sx={dataTableStyle}
      getRowId={(row) => row.ID}
      slots={{ toolbar: GridToolbar }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

export default TableEditionFournisseurs;
