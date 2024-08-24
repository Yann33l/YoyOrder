import { DataGrid } from "@mui/x-data-grid";
import { dropCOA, getCOA } from "../API/api";
import CustomToolBar from "./CustomToolBar";

const dataTableStyle = {
  margin: "auto",
  backgroundColor: "#ffffff",
  color: "#000000",
  border: "none",
  borderRadius: "5px",
  boxShadow: "0px 0px 5px 0px rgba(0,0,0,0.75)",
};

export { dataTableStyle };

const generateColumns = (
  data,
  IGNORED_FIELDS,
  EDITABLE_COLUMNS,
  handleCheckBoxChange,
  renderDropdownCell,
  CALLER,
  pieces,
  secteurs,
  handleFileChange
) => {
  const columnsWithoutIgnoredFields =
    data && data.length > 0
      ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
      : [];
  const S_SizeColumn = [];
  const M_SizeColumn = [
    "telephone",
    "COA",
    "date_Réception",
    "date_Commande",
    "date_Demande",
    "date_Péremption",
    "Lot",
    "Ref article",
    "quantité_Commandé",
    "quantité_Reçue",
    "quantité_ReceptionRestante",
    "quantité_En attente",
    "quantité_A commander",
    "quantité_Par article",
    "quantité_Sous article",
    "quantité_LotRestante",
    "quantité_LotTotal",
    "dateDebutValidite",
    "dateFinValidite",
    "date_FinUtilisation",
    "date_DebutUtilisation",
    "Ref",
    "sous article_Ref",
    "article_Ref",
    "En totalité ?",
    "Admin",
    "Demandeur",
    "Acheteur",
    "Autorisation",
    "Editeur",
  ];
  if (CALLER === "EditArticle") {
    M_SizeColumn.push(...pieces.map((piece) => piece.libelle));
  }
  if (CALLER === "UserAdmin") {
    S_SizeColumn.push(...secteurs.map((secteur) => secteur.libelle));
  }

  const L_SizeColumn = [
    "dateDebutValidite",
    "dateFinValidite",
    "Fournisseur",
    "Conditionnement",
    "commentaire_Reception",
    "commentaire_Commande",
    "commentaire_Demande",
    "sous article_Conditionnement",
    "article_Conditionnement",
    "Sous article",
    "sous article_Libelle",
  ];
  const XL_SizeColumn = [
    "Email",
    "email",
    "libelle",
    "Article",
    "siteWeb",
    "getCertificatAnalyse",
    "article_Libelle",
  ];

  const dateColumns = [
    "date_Réception",
    "date_Péremption",
    "date_Commande",
    "date_Demande",
    "dateDebutValidite",
    "dateFinValidite",
    "date_FinUtilisation",
    "date_DebutUtilisation",
  ];

  let checkboxColumns = ["En totalité ?"];
  if (CALLER === "EditArticle") {
    checkboxColumns = [
      ...checkboxColumns,
      ...pieces.map((piece) => piece.libelle),
    ];
  } else if (CALLER === "UserAdmin") {
    checkboxColumns = [
      ...checkboxColumns,
      ...columnsWithoutIgnoredFields.filter((column) => column !== "Email"),
    ];
  }

  const fileColumns = ["COA"];

  const dropdownColumns = ["Fournisseur"];

  const calculateDaysDifference = (date) => {
    const currentDate = new Date();
    const targetDate = new Date(date);
    const differenceInTime = targetDate.getTime() - currentDate.getTime();
    return Math.floor(differenceInTime / (1000 * 3600 * 24));
  };

  const renderIsExpired = (params) => {
    const daysDifference = calculateDaysDifference(params.value);
    let backgroundColor = "transparent";

    if (daysDifference < -1) {
      backgroundColor = "red"; // Date de péremption dépassée
    } else if (daysDifference < 30) {
      console.log(daysDifference);
      backgroundColor = "orange"; // Date de péremption proche
    }

    return (
      <div
        style={{
          backgroundColor,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {params.value ? new Date(params.value).toLocaleDateString() : ""}
      </div>
    );
  };

  const Columns = columnsWithoutIgnoredFields.map((label) => {
    let width = 50;
    if (S_SizeColumn.includes(label)) {
      width = 50;
    } else if (M_SizeColumn.includes(label)) {
      width = 100;
    } else if (L_SizeColumn.includes(label)) {
      width = 150;
    } else if (XL_SizeColumn.includes(label)) {
      width = 300;
    }
    const renderCheckCell = (params) => {
      const isReadOnly = CALLER === "historiqueReception";
      return (
        <input
          type="checkbox"
          checked={params.value || false}
          onChange={isReadOnly ? null : () => handleCheckBoxChange(params)}
          disabled={isReadOnly}
        />
      );
    };

    const renderFileCell = (params) => {
      if (params.value) {
        return (
          <div>
            <button
              onClick={async () => {
                try {
                  const responseData = await getCOA(params.row.stock_id);
                  const pdfData = responseData["COA"];
                  const mimeType = pdfData
                    .split(",")[0]
                    .split(":")[1]
                    .split(";")[0];
                  const byteCharacters = atob(pdfData.split(",")[1]);
                  const byteNumbers = new Array(byteCharacters.length);

                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }

                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: mimeType });
                  const blobUrl = URL.createObjectURL(blob);

                  window.open(blobUrl, "_blank");
                } catch (error) {
                  console.error("Error opening COA: ", error);
                }
              }}
              disabled={!params.row.stock_id}
            >
              Ouvrir
            </button>
            <button
              onClick={async () => {
                try {
                  const responseData = await dropCOA(params.row.stock_id);
                  if (responseData.COA === null) {
                    handleFileChange(params, null, true); // Ajoute le 3ème argument pour indiquer que le fichier a été supprimé
                  } else {
                    alert(
                      "Une erreur est survenue lors de la suppression du COA"
                    );
                  }
                } catch (error) {
                  console.error("Error dropping COA: ", error);
                }
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "red";
                e.target.style.border = "1px solid grey";
                e.target.style.borderRadius = "2px";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "lightgray";
              }}
            >
              X
            </button>
          </div>
        );
      } else {
        if (params.row.Lot) {
          return (
            <div>
              <input
                id={`files-${params.row.stock_id}`} // Donne un id unique basé sur le stock_id
                style={{ display: "none" }}
                type="file"
                onChange={(e) => {
                  handleFileChange(params, e.target.files[0]);
                }}
              />
              <label
                className="button-upload"
                htmlFor={`files-${params.row.stock_id}`}
              >
                Ajouter
              </label>
            </div>
          );
        } else {
          return <span></span>;
        }
      }
    };

    let valueGetter;
    if (dateColumns.includes(label)) {
      valueGetter = (params) => (params.value ? new Date(params.value) : "");
    }

    let renderCell;
    let renderEditCell;
    if (label === "date_Péremption") {
      renderCell = renderIsExpired;
    } else if (checkboxColumns.includes(label)) {
      renderCell = renderCheckCell;
    } else if (fileColumns.includes(label)) {
      renderCell = renderFileCell;
    } else if (dropdownColumns.includes(label)) {
      renderEditCell = renderDropdownCell;
    }

    const column = {
      field: label,
      headerName:
        label === "dateFinValidite"
          ? "Fin validité"
          : label === "dateDebutValidite"
          ? "Début validité"
          : label === "date_DebutUtilisation"
          ? "Début d'utilisation"
          : label === "date_FinUtilisation"
          ? "Fin d'utilisation"
          : label === "quantité_LotTotal"
          ? "Lot total"
          : label === "quantité_LotRestante"
          ? "Lot restant"
          : label === "quantité_ReceptionRestante"
          ? "Restante"
          : label.substring(label.indexOf("_") + 1),
      width: width,
      editable: EDITABLE_COLUMNS.includes(label) ? true : false,
      headerClassName: EDITABLE_COLUMNS.includes(label)
        ? "editableHeader"
        : "notEditableHeader",
      type: dateColumns.includes(label) ? "date" : undefined,
    };

    if (label === "date_Péremption") {
      column.renderCell = renderIsExpired;
    }
    if (valueGetter) {
      column.valueGetter = valueGetter;
    }
    if (renderCell) {
      column.renderCell = renderCell;
    }
    if (renderEditCell) {
      column.renderEditCell = renderEditCell;
    }
    return column;
  });

  return Columns;
};

export { generateColumns };

const columnGroupingModel = [
  {
    groupId: "Dates",
    description: "",
    children: [
      { field: "date_Réception" },
      { field: "date_Péremption" },
      { field: "date_Commande" },
      { field: "date_Demande" },
      { field: "dateDebutValidite" },
      { field: "dateFinValidite" },
      { field: "date_DebutUtilisation" },
      { field: "date_FinUtilisation" },
    ],
  },
  {
    groupId: "Quantités",
    description: "",
    children: [
      { field: "quantité_Commandé" },
      { field: "quantité_Reçue" },
      { field: "quantité_En attente" },
      { field: "quantité_A commander" },
      { field: "quantité_Par article" },
      { field: "quantité_Sous article" },
      { field: "quantité_LotTotal" },
      { field: "quantité_LotRestante" },
      { field: "quantité_ReceptionRestante" },
    ],
  },
  {
    groupId: "Commentaires",
    description: "",
    children: [
      { field: "commentaire_Reception" },
      { field: "commentaire_Commande" },
      { field: "commentaire_Demande" },
    ],
  },
  {
    groupId: "Articles",
    description: "",
    children: [
      { field: "article_Libelle" },
      { field: "article_Ref" },
      { field: "article_Conditionnement" },
    ],
  },
  {
    groupId: "Sous articles",
    description: "",
    children: [
      { field: "sous article_Libelle" },
      { field: "sous article_Ref" },
      { field: "sous article_Conditionnement" },
    ],
  },
];

export { columnGroupingModel };

export const returnTable = (
  RowID,
  data,
  IGNORED_FIELDS,
  EDITABLE_COLUMNS,
  handleCellEditCommit,
  handleCheckBoxChange,
  renderDropdownCell,
  CALLER,
  pieces,
  secteurs,
  setSelectedRows,
  handleFileChange
) => (
  <div
    style={
      CALLER === "SelectionArticles" ||
      CALLER === "SelectionArticlesOuSousArticles"
        ? { height: "60vh", width: "100%" }
        : { height: "78vh", width: "100%" }
    }
  >
    <DataGrid
      style={{ borderRadius: "8px" }}
      experimentalFeatures={{ columnGrouping: true }}
      rows={data}
      {...(CALLER === "SelectionArticles"
        ? {
            checkboxSelection: true,
            onRowSelectionModelChange: (RowID) => {
              const selectedIDs = new Set(RowID);
              setSelectedRows(selectedIDs);
            },
          }
        : {})}
      {...(CALLER === "SelectionArticlesOuSousArticles"
        ? {
            checkboxSelection: true,
            onRowSelectionModelChange: (RowIDs) => {
              const selectedIDs = new Set();
              for (const row of RowIDs) {
                selectedIDs.add([
                  data[row].article_id,
                  data[row].sous_article_id,
                ]);
              }
              setSelectedRows(selectedIDs);
            },
          }
        : {})}
      columns={generateColumns(
        data,
        IGNORED_FIELDS,
        EDITABLE_COLUMNS,
        handleCheckBoxChange,
        renderDropdownCell,
        CALLER,
        pieces,
        secteurs,
        handleFileChange
      )}
      sx={dataTableStyle}
      getRowId={(row) => row[RowID]}
      density="compact"
      getRowHeight={() => "auto"}
      slots={{
        toolbar: CustomToolBar,
      }}
      processRowUpdate={handleCellEditCommit}
      columnGroupingModel={columnGroupingModel}
    />
  </div>
);
