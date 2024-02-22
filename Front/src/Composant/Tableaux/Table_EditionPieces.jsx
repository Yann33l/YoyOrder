import { dataTableStyle } from "./TableStyle";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL, GetPieces } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";

const IGNORED_FIELDS = ["ID"];

const TableEditionPieces = () => {
  const [gridKey, setGridKey] = useState(0);
  const [secteurs, setPieces] = useState([]);

  const fetchPieces = useCallback(async () => {
    try {
      const secteursData = await GetPieces();
      setPieces(secteursData);
    } catch (error) {
      console.error("Erreur lors de la récupération des fournisseurs :", error);
    }
  }, []);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

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
      } else
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
    const { ID } = params;
    const updatedData = [...secteurs];
    const rowIndex = updatedData.findIndex((row) => row.ID === ID);

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setPieces(updatedData);

    try {
      const requestData = {
        ID: updatedData[rowIndex]["ID"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (key === "dateDebutValidite" || key === "dateFinValidite") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== secteurs[rowIndex][key]) {
            requestData[key] = formattedDate;
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== secteurs[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData[key] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }

      if (dataChanged) {
        console.log("requestData", requestData);
        await axios.put(`${API_URL}/editPiece/`, requestData, getAuthHeader());
        await fetchPieces();

        setGridKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return (
    <DataGrid
      autoHeight
      key={gridKey}
      {...secteurs}
      rows={secteurs}
      rowHeight={35}
      columns={generateColumns(secteurs)}
      sx={dataTableStyle}
      getRowId={(row) => row.ID}
      slots={{ toolbar: GridToolbar }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

export default TableEditionPieces;
