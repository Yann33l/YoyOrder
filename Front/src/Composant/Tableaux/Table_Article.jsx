import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";

import PropTypes from "prop-types";

const IGNORED_FIELDS = ["id", "a.ID"];

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

  //generateColumns() permet de générer les colonnes du tableau en fonction des données reçues pour ne pas avoir à modifier à chaque changement de données reçues
  const generateColumns = (data) => {
    const userStatusAndSecteurs =
      data && data.length > 0
        ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
        : [];

    const articlesColumns = [
      ...userStatusAndSecteurs.map((label) => ({
        field: label,
        headerName: label,
        width: 150,
        renderCell: (params) => (params.row[label] ? params.row[label] : ""),
        //? correspond à if (params.row[label]) {params.row[label]} else {""}
      })),
    ];
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
    <DataGrid
      rows={data}
      columns={generateColumns(data)}
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
