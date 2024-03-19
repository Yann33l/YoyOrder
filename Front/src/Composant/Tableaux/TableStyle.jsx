import { DataGrid } from "@mui/x-data-grid"; // Import the DataGrid component
import CustomToolBar from "./CustomToolBar"; // Import the CustomToolbar component

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
  secteurs
) => {
  const columnsWithoutIgnoredFields =
    data && data.length > 0
      ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
      : [];
  const S_SizeColumn = [];
  const M_SizeColumn = [
    "telephone",
    "date_Reception",
    "date_Commande",
    "date_Demande",
    "quantité_Commandé",
    "quantité_Reçue",
    "quantité_En attente",
    "quantité_A commander",
    "dateDebutValidite",
    "dateFinValidite",
    "Ref",
    "En totalité ?",
    "numero IBF",
    "Admin",
    "Demandeur",
    "Acheteur",
    "Autorisation",
    "Editeur",
  ];
  if (CALLER === "editionArticle") {
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
  ];
  const XL_SizeColumn = [
    "Email",
    "email",
    "libelle",
    "Article",
    "siteWeb",
    "getCertificatAnalyse",
  ];

  const dateColumns = [
    "date_Reception",
    "date_Commande",
    "date_Demande",
    "dateDebutValidite",
    "dateFinValidite",
  ];
  const textColumns = ["commentaire_Reception"];
  let checkboxColumns = ["En totalité ?"];
  if (CALLER === "editionArticle") {
    checkboxColumns =
      [...checkboxColumns] + "," + [pieces.map((piece) => piece.libelle)];
  } else if (CALLER === "UserAdmin") {
    checkboxColumns = [
      ...checkboxColumns,
      ...columnsWithoutIgnoredFields.filter((column) => column !== "Email"),
    ];
  }

  const dropdownColumns = ["Fournisseur"];

  const Columns = columnsWithoutIgnoredFields.map((label) => {
    let width = 50;
    if (S_SizeColumn.includes(label)) {
      width = 50;
    } else if (M_SizeColumn.includes(label)) {
      width = 110;
    } else if (L_SizeColumn.includes(label)) {
      width = 150;
    } else if (XL_SizeColumn.includes(label)) {
      width = 400;
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

    let renderEditCell;
    if (dropdownColumns.includes(label)) {
      renderEditCell = renderDropdownCell;
    }

    const column = {
      field: label,
      headerName: label.substring(label.indexOf("_") + 1),
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
      { field: "date_Reception" },
      { field: "date_Commande" },
      { field: "date_Demande" },
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
  setSelectedRows
) => (
  <DataGrid
    experimentalFeatures={{ columnGrouping: true }}
    rows={data}
    {...(CALLER === "SelectionArticles" ? { checkboxSelection: true } : {})}
    columns={generateColumns(
      data,
      IGNORED_FIELDS,
      EDITABLE_COLUMNS,
      handleCheckBoxChange,
      renderDropdownCell,
      CALLER,
      pieces,
      secteurs
    )}
    onRowSelectionModelChange={(RowID) => {
      const selectedIDs = new Set(RowID);
      setSelectedRows(selectedIDs);
    }}
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
);
