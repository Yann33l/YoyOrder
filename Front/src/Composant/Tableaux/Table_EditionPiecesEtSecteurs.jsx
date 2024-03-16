import { dataTableStyle, generateColumns } from "./TableStyle";
import { DataGrid } from "@mui/x-data-grid";
import CustomToolbar from "./CustomToolBar";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL, GetPieces, GetSecteurs } from "../API/api";
import { getAuthHeader } from "../API/token";
import dayjs from "dayjs";

const IGNORED_FIELDS = ["ID"];
const EDITABLE_COLUMNS = ["libelle", "dateDebutValidite", "dateFinValidite"];

import PropTypes from "prop-types";

const TableEditionPiecesEtSecteurs = ({ PieceOuSecteur }) => {
  const [pieces, setPieces] = useState([]);
  const [secteurs, setSecteurs] = useState([]);

  useEffect(() => {
    if (PieceOuSecteur === "Piece") {
      (async () => {
        setPieces(await GetPieces());
      })();
    } else if (PieceOuSecteur === "Secteur") {
      (async () => {
        setSecteurs(await GetSecteurs());
      })();
    }
  }, [PieceOuSecteur]);

  const data = PieceOuSecteur === "Piece" ? pieces : secteurs;

  const handleCellEditCommit = async (params) => {
    const { ID } = params;
    const updatedData = [...data];
    const rowIndex = updatedData.findIndex((row) => row.ID === ID);

    const updatedRow = { ...updatedData[rowIndex] };
    for (const key in params) {
      updatedRow[key] = params[key];
    }
    updatedData[rowIndex] = updatedRow;
    setPieces(updatedData);

    try {
      const requestData = {
        ID: updatedData[rowIndex]["ID"],
      };
      let dataChanged = false;

      for (const key in updatedData[rowIndex]) {
        if (key === "dateDebutValidite" || key === "dateFinValidite") {
          const dateObj = new Date(updatedData[rowIndex][key]);
          const formattedDate = dayjs(dateObj).format("YYYY-MM-DD");
          if (formattedDate !== data[rowIndex][key]) {
            requestData[key] = formattedDate;
            dataChanged = true;
          }
        } else {
          if (updatedData[rowIndex][key] !== data[rowIndex][key]) {
            updatedData[rowIndex][key] === ""
              ? (requestData[key] = 0)
              : (requestData[key] = updatedData[rowIndex][key]);
            dataChanged = true;
          }
        }
      }

      if (dataChanged) {
        await axios.put(
          `${API_URL}/edit${PieceOuSecteur}/`,
          requestData,
          getAuthHeader()
        );
        if (PieceOuSecteur === "Piece") {
          setPieces(await GetPieces());
        } else if (PieceOuSecteur === "Secteur") {
          setSecteurs(await GetSecteurs());
        }
        return updatedRow;
      }
    } catch (error) {
      console.error("erreur sur l'api lors de l'édition des valeurs:", error);
    }
  };

  return (
    <DataGrid
      rows={data}
      columns={generateColumns(data, IGNORED_FIELDS, EDITABLE_COLUMNS)}
      sx={dataTableStyle}
      getRowId={(row) => row.ID}
      density="compact"
      slots={{
        toolbar: CustomToolbar,
      }}
      processRowUpdate={handleCellEditCommit}
    />
  );
};

TableEditionPiecesEtSecteurs.propTypes = {
  PieceOuSecteur: PropTypes.string.isRequired,
};

export default TableEditionPiecesEtSecteurs;
