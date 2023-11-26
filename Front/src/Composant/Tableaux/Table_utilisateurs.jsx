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
        setData(responseData);
      } catch (error) {
        console.error(error);
      }
    };

    getCollecte();
  }, []);

  const getRowId = (row) => row.Email;

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
    //voir pour passer avec requestData
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
    if (column.field === "Admin" || column.field === "Autorisation") {
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
      getRowId={getRowId}
      slots={{ toolbar: GridToolbar }}
    />
  );
};

export default TableUtilisateurs;
