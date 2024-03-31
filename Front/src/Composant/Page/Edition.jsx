import TableEditionArticles from "../Tableaux/Table_EditionArticles";
import TableEditionFournisseurs from "../Tableaux/Table_EditionFournisseurs";
import TableEditionPiecesEtSecteurs from "../Tableaux/Table_EditionPiecesEtSecteurs";

import { useState } from "react";

const Edition = () => {
  const [subContent, setSubContent] = useState("default");
  const [selectedElement, setSelectedElement] = useState("EditArticle");

  const menuItems = [
    { label: "Article", content: "EditArticle" },
    { label: "Sous article", content: "EditSousArticle" },
    { label: "Fournisseur", content: "Fournisseur" },
    { label: "Piece", content: "Piece" },
    { label: "Secteur", content: "Secteur" },
  ];

  const mainSubContentCreation = (subContent) => {
    let mainSubContent;
    switch (subContent) {
      case "default":
      case "EditArticle":
      case "EditSousArticle":
        if (subContent === "default") {
          subContent = "EditArticle";
        }
        mainSubContent = (
          <div className="creation">
            <TableEditionArticles ArticleOuSousArticle={subContent} />
          </div>
        );
        break;

      case "Fournisseur":
        mainSubContent = (
          <div className="creation">
            <TableEditionFournisseurs />
          </div>
        );
        break;

      case "Piece":
      case "Secteur":
        mainSubContent = (
          <div className="creation">
            <TableEditionPiecesEtSecteurs PieceOuSecteur={subContent} />
          </div>
        );
        break;

      default:
        mainSubContent = null;
    }

    return mainSubContent;
  };

  return (
    <div>
      <div>
        <nav className="sous_menu-nav">
          <ul>
            {menuItems.map((item, index) => (
              <li
                key={index}
                className={`bouton ${
                  selectedElement === item.content ? "selected" : ""
                }`}
                onClick={() => {
                  setSubContent(item.content);
                  setSelectedElement(item.content);
                }}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div>{mainSubContentCreation(subContent)}</div>
    </div>
  );
};

export default Edition;
