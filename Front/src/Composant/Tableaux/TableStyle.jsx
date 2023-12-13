// import React, { useEffect } from "react";
// const [dataTableStyle2, setDataTableStyle2] = React.useState([]);

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
  { field: "ACP", headerName: "ACP", width: 100 },
  { field: "PAM", headerName: "PAM", width: 100 },
  { field: "BIO", headerName: "BIO", width: 100 },
  { field: "RC", headerName: "RC", width: 100 },
  { field: "GEC", headerName: "GEC", width: 100 },
];

/*        const secteurLabels = Object.keys(responseData[0]).filter(
          (key) =>
            key !== "user_id" &&
            key !== "Email" &&
            key !== "Admin" &&
            key !== "Autorisation"
        );
                    // Créer dynamiquement les colonnes
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
            
                    setColumns2(dynamicColumns); */

export { columnsTableUtilisateur, dataTableStyle };
