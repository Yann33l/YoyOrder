import { useState, useEffect } from "react";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import { GetPiece } from "../API/api";
import AcceuilContent from "./Acceuil";
import Headers from "./BandeauTop";

// eslint-disable-next-line react/prop-types
function HomePage({ isAdmin, onLogout }) {
  const [content, setContent] = useState("default");
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const piecesData = await GetPiece();
        setPieces(piecesData);
      } catch (error) {
        console.error("Erreur lors de la récupération des pièces :", error);
      }
    };

    fetchData();
  }, []);

  // Contenu du main basé sur l'état
  let mainContent;
  switch (content) {
    case "acceuil":
    case "default":
      mainContent = AcceuilContent;
      break;

    case "Commande":
      mainContent = (
        <div>
          <nav className="sous_menu-nav">
            <ul>
              {pieces.map((piece) => (
                <li
                  key={piece.ID}
                  className="bouton"
                  onClick={() => setContent(piece.ID)}
                >
                  {piece.libelle}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      );
      break;
    case "Creation":
      mainContent = <div></div>;
      break;
    case "Graph2":
      mainContent = <div></div>;
      break;

    case "Admin":
      mainContent = (
        <div>
          <h1 style={{ color: "white" }}>Gestion des utilisateurs </h1>
          <TableUtilisateurs />
        </div>
      );
      break;
  }

  return (
    <div>
      <Headers isAdmin2={isAdmin} onClick={setContent} onLogout2={onLogout} />

      <main className="ZoneTravail">{mainContent}</main>

      <footer>
        <p>réalisé par Yannick Leger</p>
      </footer>
    </div>
  );
}

export default HomePage;
