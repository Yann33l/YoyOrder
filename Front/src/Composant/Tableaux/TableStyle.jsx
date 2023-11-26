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

const columnsTableUtilisateur = [
  { field: "Email", headerName: "Email", width: 250 },
  { field: "Admin", headerName: "Admin", width: 100 },
  { field: "Autorisation", headerName: "Compte actif", width: 100 },
];

export {
  columnsTableUtilisateur,
  dataTableStyle,
};
