import axios from "axios";
import { getAuthHeader, setAuthHeader } from "./token";

export let API_URL;

if (
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
) {
  // Environnement local
  API_URL = import.meta.env.VITE_API_LOCAL_URL;
} else {
  // Environnement en ligne
  API_URL = import.meta.env.VITE_API_ONLINE_URL;
}

export const checkUser = async (Email) => {
  try {
    const requestData = {
      params: {
        email: Email,
      },
    };
    const response = await axios.get(`${API_URL}/userByEmail/`, requestData);
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const uploadCOA = async (requestData) => {
  try {
    const response = await axios.put(
      `${API_URL}/uploadCOA/`,
      requestData,
      getAuthHeader()
    );
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createUser = async (Email, Password) => {
  try {
    const response = await axios.post(`${API_URL}/create_user/`, {
      Email: Email,
      Password: Password,
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getUserInfo = async () => {
  try {
    const response = await axios.post(
      `${API_URL}/user/info/`,
      null,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const checkCredentials = async (Email, Password) => {
  try {
    const requestData = {
      Email: Email,
      Password: Password,
    };
    const loginResponse = await axios.post(
      `${API_URL}/Connexion/`,
      requestData
    );
    const authToken = loginResponse.data.access_token;
    const authHeader = {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
    setAuthHeader(authHeader);

    const data = getUserInfo();
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const GetActivesPieces = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/get_active_pieces/`,
      getAuthHeader()
    );
    const pieces = response.data;
    return pieces;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des pièces depuis l'API :",
      error
    );
    throw error;
  }
};

export const GetActivesArticles = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/get_active_Articles/`,
      getAuthHeader()
    );
    const Articles = response.data;
    return Articles;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des pièces depuis l'API :",
      error
    );
    throw error;
  }
};

export const GetPieces = async () => {
  try {
    const response = await axios.get(`${API_URL}/get_pieces/`, getAuthHeader());
    const pieces = response.data;
    return pieces;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des pièces depuis l'API :",
      error
    );
    throw error;
  }
};

export const GetFournisseurs = async () => {
  try {
    const response = await axios.get(`${API_URL}/fournisseurs/`);
    const Fournisseurs = response.data;
    return Fournisseurs;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des pièces depuis l'API :",
      error
    );
    throw error;
  }
};

export const GetActiveFournisseurs = async () => {
  try {
    const response = await axios.get(`${API_URL}/fournisseursActifs/`);
    const Fournisseurs = response.data;
    return Fournisseurs;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des pièces depuis l'API :",
      error
    );
    throw error;
  }
};

export const GetSecteurs = async () => {
  try {
    const response = await axios.get(`${API_URL}/secteurs/`, getAuthHeader());
    const Secteurs = response.data;
    return Secteurs;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des pièces depuis l'API :",
      error
    );
    throw error;
  }
};

export const createData = async (newData, table) => {
  try {
    console.log("newData", newData);
    const response = await axios.post(
      `${API_URL}/create_${table}/`,
      newData,
      getAuthHeader()
    );

    const data = response.data;
    return data;
  } catch (error) {
    switch (table) {
      case "fournisseur":
        alert("Le fournisseur existe déjà");
        break;
      default:
      case "article":
        alert("L'article existe déjà");
        break;
      case "secteur":
        alert("Le secteur existe déjà");
        break;
    }
    console.error(error);
    throw error;
  }
};

export const getDataForTables = async (setData, table, piece) => {
  try {
    const response = await axios.get(
      piece === undefined
        ? `${API_URL}/${table}`
        : `${API_URL}/${table}/${piece}`,
      getAuthHeader()
    );
    const data = response.data;
    if (table === "secteur_labels") {
      setData(data);
    } else {
      setData(data.results);
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getCOA = async (stockID) => {
  try {
    const response = await axios.get(
      `${API_URL}/getCOA/${stockID}`,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const dropCOA = async (stockID) => {
  try {
    const response = await axios.delete(
      `${API_URL}/dropCOA/${stockID}`,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
