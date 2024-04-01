import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import TableArticlesCommande from "../Tableaux/Table_ArticleCommande";
import Edition from "./Edition";
import TableArticlesReception from "../Tableaux/Table_ArticleReception";
import { GetActivesPieces } from "../API/api";
import AcceuilContent from "./Acceuil";
import Headers from "./BandeauTop";
import TableArticlesDemande from "../Tableaux/Table_ArticleDemande";
import Creation from "./Creation";
import TableHistoriqueCommande from "../Tableaux/Table_HistoriqueCommande";

function HomePage({ onLogout }) {
  const [content, setContent] = useState("default");
  const [pieces, setPieces] = useState([]);
  const [selectedElement, setSelectedElement] = useState("Tous");

  const fetchPieces = async () => {
    try {
      const piecesData = await GetActivesPieces();
      setPieces(piecesData);
    } catch (error) {
      console.error("Erreur lors de la récupération des pièces :", error);
    }
  };

  useEffect(() => {
    fetchPieces();
  }, []);

  let mainContent;

  switch (content) {
    case "acceuil":
    case "default":
      mainContent = AcceuilContent;
      break;
    case "Commande":
      mainContent = (
        <div>
          <div style={{ height: "51px" }} />
          <TableArticlesCommande />
        </div>
      );
      break;
    case "Demande":
    case "Reception":
      mainContent = (
        <div>
          <div>
            <nav className="sous_menu-nav">
              <ul>
                <li
                  className={`bouton ${
                    selectedElement === "Tous" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedElement("Tous");
                  }}
                >
                  Tous
                </li>
                {pieces.map((piece) => (
                  <li
                    key={piece.ID}
                    className={`bouton ${
                      selectedElement === piece.libelle ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedElement(piece.libelle);
                    }}
                  >
                    {piece.libelle}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div>
            {content === "Demande" ? (
              <TableArticlesDemande pieces={selectedElement} />
            ) : (
              <TableArticlesReception pieces={selectedElement} />
            )}
          </div>
        </div>
      );
      break;
    case "Creation":
      mainContent = <Creation />;
      break;
    case "Historique":
      mainContent = (
        <div>
          <div style={{ height: "51px" }} />
          <TableHistoriqueCommande />;
        </div>
      );
      break;
    case "Edition":
      mainContent = <Edition />;
      break;
    case "Admin":
      mainContent = (
        <div>
          <div style={{ height: "51px" }} />
          <TableUtilisateurs />
        </div>
      );
      break;
  }

  return (
    <div className="page">
      <Headers {...{ setContent, onLogout }} />

      <main className="ZoneTravail">{mainContent}</main>

      <footer>
        <p>réalisé par Yannick Leger</p>
      </footer>
    </div>
  );
}

export default HomePage;

HomePage.propTypes = {
  onLogout: PropTypes.func.isRequired,
};
