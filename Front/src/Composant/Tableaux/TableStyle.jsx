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
  handleCheckBoxChange
) => {
  const S_SizeColumn = [];
  const M_SizeColumn = [
    "date_Reception",
    "date_Commande",
    "date_Demande",
    "quantité_Commandé",
    "quantité_Reçue",
    "quantité_En attente",
    "quantité_A commander",
    "Ref",
    "En totalité ?",
    "numero IBF",
  ];
  const L_SizeColumn = [
    "Fournisseur",
    "Conditionnement",
    "commentaire_Reception",
    "commentaire_Commande",
    "commentaire_Demande",
  ];
  const XL_SizeColumn = ["Article"];

  const dateColumns = ["date_Reception", "date_Commande", "date_Demande"];
  const textColumns = ["commentaire_Reception"];
  const checkboxColumns = ["En totalité ?"];

  const columnsWithoutIgnoredFields =
    data && data.length > 0
      ? Object.keys(data[0]).filter((key) => !IGNORED_FIELDS.includes(key))
      : [];

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
      return (
        <input
          type="checkbox"
          checked={params.value || false}
          onChange={() => handleCheckBoxChange(params)}
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
