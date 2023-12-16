import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import React, { useEffect } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import { dataTableStyle } from "./TableStyle";

const TableUtilisateurs = () => {
  const [responseData, setResponseData] = React.useState([]);
  const [data, setData] = React.useState([]);
  const authHeader = getAuthHeader();

  useEffect(() => {
    const getUtilisateurs = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/`, authHeader);
        const responseData = response.data;
        setResponseData(responseData);
        console.log(responseData);
        const dataWithIds = responseData.results.map((row, index) => ({
          ...row,
          id: index + 1,
        }));
        setData(dataWithIds);
      } catch (error) {
        console.error(error);
      }
    };

    getUtilisateurs();
  }, []);

  const handleCheckBoxChange = async (event, params) => {
    const newValue = event.target.checked;
    const updatedData = data.map((row) => {
      if (row.Email === params.row.Email) {
        return {
          ...row,
          [params.field]: newValue,
        };
      }
      return row;
    });
    const authHeader = getAuthHeader();

    // Envoyer la mise à jour à la base de données via une requête HTTP
    if (params.field === "Admin") {
      try {
        const requestData = {
          Email: params.row.Email,
          Admin: newValue,
        };
        await axios.put(`${API_URL}/editUserAdmin/`, requestData, authHeader);
        setData(updatedData);
      } catch (error) {
        console.error("Erreur lors de la mise à jour : ", error);
      }
    }
    if (params.field === "Autorisation") {
      try {
        const requestData = {
          Email: params.row.Email,
          Autorisation: newValue,
        };
        await axios.put(
          `${API_URL}/editUserAutorisation/`,
          requestData,
          authHeader
        );
        setData(updatedData);
      } catch (error) {
        console.error("Erreur lors de la mise à jour : ", error);
      }
    }
    if (
      params.field !== "Email" &&
      params.field !== "Admin" &&
      params.field !== "Autorisation"
    ) {
      try {
        const requestData = {
          user_id: params.row.user_id,
          secteur_libelle: params.field,
        };
        await axios.put(`${API_URL}/editUserSecteur/`, requestData, authHeader);
        setData(updatedData);
      } catch (error) {
        console.error("Erreur lors de la mise à jour : ", error);
      }
    }
  };

  const renderCheckCell = (params) => {
    return (
      <input
        type="checkbox"
        checked={params.value || false} // Provide a default value of false
        onChange={(event) => handleCheckBoxChange(event, params)}
      />
    );
  };

  const secteurLabels =
    responseData.results && responseData.results.length > 0
      ? Object.keys(responseData.results[0]).filter(
          (key) =>
            key !== "user_id" &&
            key !== "Email" &&
            key !== "Admin" &&
            key !== "Autorisation"
        )
      : [];

  const dynamicColumns = [
    { field: "Email", headerName: "Email", width: 250 },
    {
      field: "Admin",
      headerName: "Admin",
      width: 100,
      renderCell: renderCheckCell,
    },
    {
      field: "Autorisation",
      headerName: "Compte actif",
      width: 100,
      renderCell: renderCheckCell,
    },
    ...secteurLabels.map((label) => ({
      field: label,
      headerName: label,
      width: 100,
      renderCell: renderCheckCell,
    })),
  ];

  // modification des colonnes Admin et Autorisation pour afficher les checkbox
  const columns = dynamicColumns.map((column) => {
    if (column.field !== "Email") {
      return {
        ...column,
        renderCell: renderCheckCell,
      };
    }
    return column;
  });

  // Affichage du tableau
  return (
    <DataGrid
      rows={data}
      columns={columns}
      loading={!data.length}
      sx={dataTableStyle}
      getRowId={(row) => row.id}
      slots={{ toolbar: GridToolbar }}
    />
  );
};

export default TableUtilisateurs;
