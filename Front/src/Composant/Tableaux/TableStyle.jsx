import { DataGrid } from "@mui/x-data-grid";
import CustomToolBar from "./CustomToolBar";
import { getCOA } from "../API/api";

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
  const textColumns = ["commentaire_Reception"];
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
          <button
            onClick={async () => {
              const responseData = await getCOA(params.row.stock_id);
              var pdfData = responseData["COA"];
              var mimeType = pdfData.split(",")[0].split(":")[1].split(";")[0];

              var byteCharacters = atob(pdfData.split(",")[1]);
              var byteNumbers = new Array(byteCharacters.length);
              for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              var byteArray = new Uint8Array(byteNumbers);
              var blob = new Blob([byteArray], { type: mimeType });

              // Créer une URL objet à partir du Blob
              var blobUrl = URL.createObjectURL(blob);

              // Ouvrir une nouvelle fenêtre avec l'URL du Blob
              window.open(blobUrl, "_blank");
            }}
          >
            Ouvrir
          </button>
        );
      } else {
        if (params.row.Lot) {
          return (
            <div>
              <input
                id="files"
                style={{ display: "none" }}
                type="file"
                onChange={(e) => {
                  handleFileChange(params, e.target.files[0]);
                }}
              />
              <label className="button-upload" htmlFor="files">
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
    if (textColumns.includes(label)) {
      renderCell = (params) => (params.row[label] ? params.row[label] : "");
    } else if (checkboxColumns.includes(label)) {
      renderCell = renderCheckCell;
    }
    if (fileColumns.includes(label)) {
      renderCell = renderFileCell;
    }

    let renderEditCell;
    if (dropdownColumns.includes(label)) {
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
      CALLER === "SelectionArticles"
        ? { height: "60vh", width: "100%" }
        : { height: "80vh", width: "100%" }
    }
  >
    <DataGrid
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
      h
      getRowHeight={() => "auto"}
      slots={{
        toolbar: CustomToolBar,
      }}
      processRowUpdate={handleCellEditCommit}
      columnGroupingModel={columnGroupingModel}
    />
  </div>
);
