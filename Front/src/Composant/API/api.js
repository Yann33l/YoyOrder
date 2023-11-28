import axios from 'axios';
import { setAuthHeader } from "./token";

export let API_URL;

if (
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
) {
  // Environnement local
  API_URL = "http://127.0.0.1:8000";
} else {
  // Environnement en ligne
  API_URL = "https://goldenline.osc-fr1.scalingo.io";
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

    const response = await axios.post(
      `${API_URL}/user/info/`,
      null,
      authHeader
    );
    const data = response.data;
    return data;
    
  } catch (error) {
    console.error(error);
    throw error;
  }
};
