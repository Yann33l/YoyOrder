import TableEditionArticles from "../Tableaux/Table_EditionArticles";
import { useState } from "react";

const Edition = () => {
  const [subContent, setSubContent] = useState("default");

  const mainSubContentCreation = (subContent) => {
    let mainSubContent;
    switch (subContent) {
      case "Article":
      case "default":
        mainSubContent = (
          <div className="creation">
            <p>ici c&rsquo;est l&apos;édition {subContent}</p>
            <TableEditionArticles />
          </div>
        );
        break;

      case "Fournisseur":
        mainSubContent = (
          <div className="creation">
            <p>ici c&rsquo;est l&apos;édition {subContent}</p>
          </div>
        );
        break;

      case "Piece":
        mainSubContent = (
          <div className="creation">
            <p>ici c&#39;est la création {subContent}</p>
          </div>
        );
        break;
    }

    return mainSubContent;
  };

  return (
    <div>
      <div>
        <nav className="sous_menu-nav">
          <ul>
            <li className="bouton" onClick={() => setSubContent("Article")}>
              Article
            </li>
            <li className="bouton" onClick={() => setSubContent("Fournisseur")}>
              Fournisseur
            </li>
            <li
              className="bouton"
              onClick={() => setSubContent("Lieu de stockage")}
            >
              Lieu de stockage
            </li>
            <li className="bouton" onClick={() => setSubContent("Piece")}>
              Piece
            </li>
            <li className="bouton" onClick={() => setSubContent("Secteur")}>
              Secteur
            </li>
          </ul>
        </nav>
      </div>
      <div>{mainSubContentCreation(subContent)}</div>
    </div>
  );
};

export default Edition;
