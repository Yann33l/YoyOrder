import { useState, useEffect } from "react";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import TableArticlesCommande from "../Tableaux/Table_ArticleCommande";
import Edition from "./Edition";
import { GetPiece } from "../API/api";
import AcceuilContent from "./Acceuil";
import Headers from "./BandeauTop";
import mainSubContentDemande from "./Demande";
import PropTypes from "prop-types";
import Creation from "./Creation";

function HomePage({ onLogout }) {
  const [content, setContent] = useState("default");
  const [pieces, setPieces] = useState([]);
  const [subContent, setSubContent] = useState("default");
  const fetchPieces = async () => {
    try {
      const piecesData = await GetPiece();
      setPieces(piecesData);
    } catch (error) {
      console.error("Erreur lors de la récupération des pièces :", error);
    }
  };
  const isDemandeContent = content === "Demande";

  useEffect(() => {
    fetchPieces();
  }, [isDemandeContent]);

  let mainContent;
  switch (content) {
    case "acceuil":
    case "default":
      mainContent = AcceuilContent;
      break;
    case "Commande":
      mainContent = (
        <div>
          <p>ici c&#39;est la commande</p>
          <TableArticlesCommande />
        </div>
      );
      break;

    case "Demande":
      mainContent = (
        <div>
          <div>
            <nav className="sous_menu-nav">
              <ul>
                <li className="bouton" onClick={() => setSubContent("Tous")}>
                  Tous
                </li>
                {pieces.map((piece) => (
                  <li
                    key={piece.ID}
                    className="bouton"
                    onClick={() => setSubContent(piece.libelle)}
                  >
                    {piece.libelle}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div>{mainSubContentDemande(subContent, pieces)}</div>
        </div>
      );
      break;
    case "Creation":
      mainContent = <Creation />;
      break;
    case "Edition":
      mainContent = <Edition />;
      break;
    case "Admin":
      mainContent = (
        <div>
          <h1>Gestion des utilisateurs </h1>
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
