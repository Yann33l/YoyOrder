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

function HomePage({ onLogout, initialContent = "default" }) {
  const [content, setContent] = useState(initialContent);
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
      mainContent = <AcceuilContent />;
      break;
    case "Commande":
      mainContent = (
        <section className="table-shell">
          <TableArticlesCommande />
        </section>
      );
      break;
    case "Demande":
    case "Reception":
    case "Stocks":
      mainContent = (
        <>
          <nav className="sous_menu-nav" aria-label="Filtre des pièces">
            <ul>
              <li>
                <button
                  className={`bouton ${
                    selectedElement === "Tous" ? "selected" : ""
                  }`}
                  type="button"
                  aria-pressed={selectedElement === "Tous"}
                  onClick={() => {
                    setSelectedElement("Tous");
                  }}
                >
                  Tous
                </button>
              </li>
              {pieces.map((piece) => (
                <li key={piece.ID}>
                  <button
                    className={`bouton ${
                      selectedElement === piece.libelle ? "selected" : ""
                    }`}
                    type="button"
                    aria-pressed={selectedElement === piece.libelle}
                    onClick={() => {
                      setSelectedElement(piece.libelle);
                    }}
                  >
                    {piece.libelle}
                  </button>
                </li>
              ))}
              {content === "Reception" && (
                <li>
                  <button
                    className={`bouton ${
                      selectedElement === "Ajout" ? "selected" : ""
                    }`}
                    type="button"
                    aria-pressed={selectedElement === "Ajout"}
                    onClick={() => setSelectedElement("Ajout")}
                  >
                    Récep. (rempl./suppl.)
                  </button>
                </li>
              )}
            </ul>
          </nav>
          <section className="table-shell">
            {content === "Demande" ? (
              <TableArticlesDemande pieces={selectedElement} />
            ) : content === "Reception" && selectedElement === "Ajout" ? (
              <div>
                <p>Ajout de reception (remplacement/supplement)</p>
                <PageAjoutLigneReception />
              </div>
            ) : content === "Reception" ? (
              <TableArticlesReception pieces={selectedElement} />
            ) : (
              <TableArticlesEnStock pieces={selectedElement} />
            )}
          </section>
        </>
      );
      break;
    case "Creation":
      mainContent = <Creation />;
      break;
    case "Historique":
      mainContent = (
        <>
          <nav className="sous_menu-nav" aria-label="Historique">
            <ul>
              {menuItems.map((item) => (
                <li key={item.content}>
                  <button
                    className={`bouton ${
                      selectedItem === item.content ? "selected" : ""
                    }`}
                    type="button"
                    aria-pressed={selectedItem === item.content}
                    onClick={() => {
                      setSubContent(item.content);
                      setSelectedItem(item.content);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <section className="table-shell">{mainSubContent(subContent)}</section>
        </>
      );
      break;
    case "Edition":
      mainContent = <Edition />;
      break;
    case "Admin":
      mainContent = (
        <section className="table-shell">
          <TableUtilisateurs />
        </section>
      );
      break;
  }

  return (
    <div className="page">
      <Headers {...{ setContent, onLogout }} />

      <main className="ZoneTravail">
        {mainContent}
      </main>

      <footer>
        <p>réalisé par Yannick Leger</p>
      </footer>
    </div>
  );
}

export default HomePage;

HomePage.propTypes = {
  onLogout: PropTypes.func.isRequired,
  initialContent: PropTypes.string,
};
