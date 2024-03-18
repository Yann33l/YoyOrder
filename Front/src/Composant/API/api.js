import axios from "axios";
import { setAuthHeader, getAuthHeader } from "./token";

export let API_URL;

if (
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
) {
  // Environnement local
  API_URL = "http://127.0.0.1:8000";
} else {
  // Environnement en ligne
  API_URL = "https://yoyorder.osc-fr1.scalingo.io";
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

export const createPiece = async (newPieceData) => {
  try {
    const response = await axios.post(
      `${API_URL}/create_piece/`,
      newPieceData,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    alert("La pièce existe déjà");
    console.error(error);
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

export const createFournisseur = async (newFournisseurData) => {
  try {
    const response = await axios.post(
      `${API_URL}/create_fournisseur/`,
      newFournisseurData,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    alert("Le fournisseur existe déjà");
    console.error(error);
    throw error;
  }
};

export const createArticle = async (newArticleData) => {
  try {
    const response = await axios.post(
      `${API_URL}/create_article/`,
      newArticleData,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    alert("L'article existe déjà");
    console.error(error);
    throw error;
  }
};

export const createSecteur = async (newSecteurData) => {
  try {
    const response = await axios.post(
      `${API_URL}/create_secteur/`,
      newSecteurData,
      getAuthHeader()
    );
    const data = response.data;
    return data;
  } catch (error) {
    alert("Le secteur existe déjà");
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
