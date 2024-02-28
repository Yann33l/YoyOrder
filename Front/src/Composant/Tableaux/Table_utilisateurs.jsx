import { DataGrid } from "@mui/x-data-grid";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../API/api";
import { getAuthHeader } from "../API/token";
import { dataTableStyle } from "./TableStyle";

const IGNORED_FIELDS = ["user_id", "Email", "id"];
const STATUS_FIELDS = [
  "Admin",
  "Demandeur",
  "Acheteur",
  "Autorisation",
  "Editeur",
];

const TableUtilisateurs = () => {
  const [data, setData] = useState([]);

  const getUtilisateurs = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/`, getAuthHeader());
      const data = response.data;
      console.log(data);
      const dataWithIds = data.results.map((row, index) => ({
        ...row,
        id: index + 1,
      }));
      setData(dataWithIds);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
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

    try {
      if (STATUS_FIELDS.includes(params.field)) {
        const requestData = {
          Email: params.row.Email,
          Status: newValue,
        };
        await axios.put(
          `${API_URL}/editUserStatus/${params.field}/`,
          requestData,
          getAuthHeader()
        );
      } else if (!IGNORED_FIELDS.includes(params.field)) {
        const requestData = {
          user_id: params.row.user_id,
          secteur_libelle: params.field,
        };
        await axios.put(
          `${API_URL}/editUserSecteur/`,
          requestData,
          getAuthHeader()
        );
      }
      setData(updatedData);
    } catch (error) {
      console.error("Erreur lors de la mise à jour : ", error);
    }
  };

  const renderCheckCell = (params) => {
    return (
      <input
        type="checkbox"
        checked={params.value || false}
        onChange={(event) => handleCheckBoxChange(event, params)}
      />
    );
  };

  const userStatusAndSecteurs =
    data && data.length > 0
      ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
      : [];

  const dynamicColumns = [
    { field: "Email", headerName: "Email", width: 250 },
    ...userStatusAndSecteurs.map((label) => ({
      field: label,
      headerName: label,
    })),
  ];

  // modification des colonnes pour affichage en checkbox
  const columns = dynamicColumns.map((column) => {
    if (column.field !== "Email") {
      return {
        ...column,
        renderCell: renderCheckCell,
        flex: 1,
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
      density="compact"
      slots={{
        toolbar: CustomToolbar,
      }}
    />
  );
};

export default TableUtilisateurs;
