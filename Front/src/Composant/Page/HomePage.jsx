import { useState, useEffect } from "react";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import TableArticlesCommande from "../Tableaux/Table_ArticleCommande";
import { GetPiece } from "../API/api";
import AcceuilContent from "./Acceuil";
import Headers from "./BandeauTop";
import mainSubContentDemande from "./Demande";
import { useForm } from "react-hook-form";

// eslint-disable-next-line react/prop-types
function HomePage({ isAdmin, onLogout }) {
  const [content, setContent] = useState("default");
  const [pieces, setPieces] = useState([]);
  const [subContent, setSubContent] = useState("default");
  const { register, handleSubmit } = useForm();

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

  const mainSubContentCreation = (subContent) => {
    const onSubmit = (data) => console.log(data);

    let mainSubContent; // Déclarer ici avec let

    switch (subContent) {
      case "Article":
        mainSubContent = (
          <div>
            <p>ici c&#39;est la création {subContent}</p>
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                type="text"
                placeholder="Nom de l'article "
                {...register("Nom_article ", {
                  required: true,
                  maxLength: 80,
                })}
              />
              <input type="submit" />
            </form>
          </div>
        );
        break;
      default:
        mainSubContent = null; // Gérer les autres cas si nécessaire
        break;
    }

    return mainSubContent; // Retourner la valeur
  };
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
      mainContent = (
        <div>
          <div>
            <nav className="sous_menu-nav">
              <ul>
                <li className="bouton" onClick={() => setSubContent("Article")}>
                  Article
                </li>
                <li
                  className="bouton"
                  onClick={() => setSubContent("Fournisseur")}
                >
                  Fournisseur
                </li>
                <li
                  className="bouton"
                  onClick={() => setSubContent("Lieu de stockage")}
                >
                  Lieu de stockage
                </li>
                <li className="bouton" onClick={() => setSubContent("Unité")}>
                  Unité
                </li>
              </ul>
            </nav>
          </div>
          <div>{mainSubContentCreation(subContent)}</div>
        </div>
      );
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
      <Headers {...{ isAdmin, setContent, onLogout }} />

      <main className="ZoneTravail">{mainContent}</main>

      <footer>
        <p>réalisé par Yannick Leger</p>
      </footer>
    </div>
  );
}

export default HomePage;
