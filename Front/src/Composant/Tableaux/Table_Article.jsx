import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

import PropTypes from "prop-types";

const TableArticles = ({ pieces }) => {
  const [data, setData] = useState([]);
  const authHeader = getAuthHeader();

  useEffect(() => {
    const getArticles = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/articles/${pieces}`,
          authHeader
        );
        const responseData = response.data;
        const datawithIds = responseData.results.map((row, index) => ({
          ...row,
          id: index + 1,
        }));
        setData(datawithIds);
      } catch (error) {
        console.error(error);
      }
    };

    getArticles();
  }, [pieces, authHeader]);

  const articlesColumns = [
    { field: "a.ID", headerName: "article id", width: 10 },
    { field: "a.libelle", headerName: "libelle", width: 150 },
    { field: "a.ref", headerName: "ref", width: 150 },
    { field: "conditionnement", headerName: "conditionnement", width: 150 },
    { field: "fournisseur", headerName: "fournisseur", width: 150 },
    { field: "lieux de stockage", headerName: "lieux de stockage", width: 150 },
  ];

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
    <DataGrid
      rows={data}
      columns={articlesColumns}
      sx={dataTableStyle}
      getRowId={(row) => row.id}
      slots={{ toolbar: GridToolbar }}
    />
  );
};
TableArticles.propTypes = {
  pieces: PropTypes.string.isRequired,
};
export default TableArticles;
