import { DataGrid } from "@mui/x-data-grid";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import {
  dataTableStyle,
  columnGroupingModel,
  generateColumns,
} from "./TableStyle";
const IGNORED_FIELDS = ["id", "article_id", "reception_id"];
const EDITABLE_COLUMNS = [];

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

  return (
    <DataGrid
      experimentalFeatures={{ columnGrouping: true }}
      rows={data}
      columns={generateColumns(data, IGNORED_FIELDS, EDITABLE_COLUMNS)}
      sx={dataTableStyle}
      getRowHeight={() => "auto"}
      getRowId={(row) => row.id}
      density="compact"
      slots={{
        toolbar: CustomToolbar,
      }}
      columnGroupingModel={columnGroupingModel}
    />
  );
};

export default TableArticlesReception;
