import { dataTableStyle } from "./TableStyle";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";

const IGNORED_FIELDS = ["article_id"];

const TableEditionArticles = () => {
  const [articles, setArticles] = useState([]);
  const [gridKey, setGridKey] = useState(0);

  const renderCheckCell = (params) => {
    return (
      <input
        type="checkbox"
        checked={params.value || false}
        onChange={(event) => handleCellEditCommit(event, params)}
      />
    );
  };

  const updateData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/getArticleForEdit/`,
        getAuthHeader()
      );
      const responseData = response.data;
      setArticles(responseData.results);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    updateData();
  }, [updateData]);

  const generateColumns = (data) => {
    const columnsWithoutIgnoredFields =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];
    const columns = columnsWithoutIgnoredFields.map((key) => {
      if (key === "date debut validite" || key === "date fin validite") {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
          valueGetter: (params) => (params.value ? new Date(params.value) : ""),
          type: "date",
        };
      } else if (key === "nom article") {
        return {
          field: key,
          headerName: key,
          flex: 1,
          editable: true,
        };
      } else if (
        key === "ref" ||
        key === "fournisseur" ||
        key === "conditionnement"
      ) {
        return {
          field: key,
          headerName: key,
          flex: 0.3,
          editable: true,
        };
      } else {
        return {
          field: key,
          headerName: key,
          renderCell: renderCheckCell,
          flex: 0.1,
          editable: true,
        };
      }
    });
    return columns;
  };

  const handleCellEditCommit = async (params) => {
    const { article_id } = params;
    const updatedData = [...articles];
    const rowIndex = updatedData.findIndex(
      (row) => row.article_id === article_id
    );

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setArticles(updatedData);

    try {
      const requestData = {
        articleID: updatedData[rowIndex]["article_id"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (key === "date debut validite" || key === "date fin validite") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== articles[rowIndex][key]) {
            requestData[key] = formattedDate;
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== articles[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData[key] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }

      if (dataChanged) {
        console.log("requestData", requestData);
        // await axios.put(
        //   `${API_URL}/editDemande/${changedKey}`,
        //   requestData,
        //   getAuthHeader()
        // );
        await updateData();

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
      {...articles}
      rows={articles}
      rowHeight={35}
      columns={generateColumns(articles)}
      sx={dataTableStyle}
      getRowId={(row) => row.article_id}
      slots={{ toolbar: GridToolbar }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

export default TableEditionArticles;
