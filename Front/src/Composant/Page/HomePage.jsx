import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { GetActivesPieces } from "../API/api";
import TableArticlesCommande from "../Tableaux/Table_ArticleCommande";
import TableArticlesDemande from "../Tableaux/Table_ArticleDemande";
import TableArticlesReception from "../Tableaux/Table_ArticleReception";
import TableHistoriqueCommande from "../Tableaux/Table_HistoriqueCommande";
import TableHistoriqueStock from "../Tableaux/Table_HistoriqueStock";
import TableArticlesEnStock from "../Tableaux/Table_SuiviQuantite";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import AcceuilContent from "./Acceuil";
import PageAjoutLigneReception from "./AjoutLigneReception";
import Headers from "./BandeauTop";
import Creation from "./Creation";
import Edition from "./Edition";

function HomePage({ onLogout }) {
  const [content, setContent] = useState("default");
  const [pieces, setPieces] = useState([]);
  const [selectedElement, setSelectedElement] = useState("Tous");
  const [selectedItem, setSelectedItem] = useState("HistoriqueCommande");

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
  const menuItems = [
    { label: "Commandes et receptions", content: "HistoriqueCommande" },
    { label: "Stocks", content: "HistoriqueStock" },
  ];

  const [subContent, setSubContent] = useState("HistoriqueCommande");
  const mainSubContent = (selectedItem) => {
    switch (selectedItem) {
      case "HistoriqueCommande":
      case "default":
        return <TableHistoriqueCommande />;
      case "HistoriqueStock":
        return <TableHistoriqueStock />;
    }
  };

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
    case "Stocks":
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
                {content === "Reception" && (
                  <li
                    className={`bouton ${
                      content === "Demande" ? "selected" : ""
                    }`}
                    onClick={() => setSelectedElement("Ajout")}
                  >
                    Récep. (rempl./suppl.)
                  </li>
                )}
              </ul>
            </nav>
          </div>
          <div>
            {content === "Demande" ? (
              <TableArticlesDemande pieces={selectedElement} />
            ) : content === "Reception" && selectedElement == "Ajout" ? (
              <div>
                <p>Ajout de reception (remplacement/supplement)</p>
                <PageAjoutLigneReception />
              </div>
            ) : content === "Reception" ? (
              <TableArticlesReception pieces={selectedElement} />
            ) : (
              <TableArticlesEnStock pieces={selectedElement} />
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
          {" "}
          <div>
            <nav className="sous_menu-nav">
              <ul>
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`bouton ${
                      selectedItem === item.content ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSubContent(item.content);
                      setSelectedItem(item.content);
                    }}
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div>{mainSubContent(subContent)}</div>
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
