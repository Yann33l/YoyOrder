let authHeader = null;

export const setAuthHeader = (header) => {
    authHeader = header;
};

export const getAuthHeader = () => {
  return authHeader;
};