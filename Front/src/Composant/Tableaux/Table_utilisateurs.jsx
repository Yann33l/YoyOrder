import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import axios from "axios";
import React, { useEffect } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import { columnsTableUtilisateur, dataTableStyle } from "./TableStyle";

const TableUtilisateurs = () => {
  const [data, setData] = React.useState([]);
  const authHeader = getAuthHeader();

  useEffect(() => {
    const getCollecte = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/`, authHeader);
        const responseData = response.data;
        const dataWithIds = responseData.results.map((row, index) => ({
          ...row,
          id: index + 1,
        }));
        const dataWithDelete = dataWithIds.map((row) => ({
          ...row,
          delete: "Supprimer",
        }));
        setData(dataWithDelete);
      } catch (error) {
        console.error(error);
      }
    };

    getCollecte();
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
      params.field === "PAM" ||
      params.field === "BIO" ||
      params.field === "RC" ||
      params.field === "GEC" ||
      params.field === "ACP"
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
        checked={params.value}
        onChange={(event) => handleCheckBoxChange(event, params)}
      />
    );
  };

  // modification des colonnes Admin et Autorisation pour afficher les checkbox
  const columns = columnsTableUtilisateur.map((column) => {
    if (
      column.field === "Admin" ||
      column.field === "Autorisation" ||
      column.field === "PAM" ||
      column.field === "BIO" ||
      column.field === "RC" ||
      column.field === "GEC" ||
      column.field === "ACP"
    ) {
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
