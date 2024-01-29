import { useState, useEffect } from "react";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import TableArticlesCommande from "../Tableaux/Table_ArticleCommande";
import { GetPiece, GetFournisseurs, createArticle } from "../API/api";
import AcceuilContent from "./Acceuil";
import Headers from "./BandeauTop";
import mainSubContentDemande from "./Demande";
import { useForm } from "react-hook-form";

// eslint-disable-next-line react/prop-types
function HomePage({ isAdmin, onLogout }) {
  const [content, setContent] = useState("default");
  const [pieces, setPieces] = useState([]);
  const [subContent, setSubContent] = useState("default");
  const { register, handleSubmit, reset } = useForm();
  const [fournisseurs, setFournisseurs] = useState([]);

  useEffect(() => {
    const fetchPieces = async () => {
      try {
        const piecesData = await GetPiece();
        setPieces(piecesData);
      } catch (error) {
        console.error("Erreur lors de la récupération des pièces :", error);
      }
    };

    fetchPieces();
  }, []);

  useEffect(() => {
    reset();
  }, [subContent, reset]);

  useEffect(() => {
    const fetchFournisseurs = async () => {
      try {
        const fournisseursData = await GetFournisseurs();
        setFournisseurs(fournisseursData);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des fournisseurs :",
          error
        );
      }
    };

    fetchFournisseurs();
  }, []);

  const mainSubContentCreation = (subContent) => {
    const onSubmit = (data) => {
      let filteredPieceListe;
      switch (subContent) {
        case "Article":
        case "default":
          filteredPieceListe = Object.fromEntries(
            Object.entries(data.piece_liste).filter(
              ([, value]) => value === true
            )
          );
          data.piece_liste = filteredPieceListe;
          console.log(data);
          createArticle(data);
          break;
        case "Fournisseur":
          console.log(data);
          break;
      }
    };

    let mainSubContent;
    switch (subContent) {
      case "Article":
      case "default":
        mainSubContent = (
          <div className="creation">
            <p>ici c&#39;est la création {subContent}</p>
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                className="custom-input"
                type="text"
                placeholder="Nom de l'article "
                {...register("libelle", {
                  required: true,
                  maxLength: 255,
                })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Réference"
                {...register("ref", { required: true, maxLength: 255 })}
              />
              <br />
              <select
                className="custom-select"
                {...register("fournisseur_id", { required: true })}
              >
                {fournisseurs.map((fournisseur) => (
                  <option key={fournisseur.ID} value={fournisseur.ID}>
                    {fournisseur.libelle}
                  </option>
                ))}
              </select>
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Conditionnement"
                {...register("conditionnement", {
                  required: true,
                  maxLength: 255,
                })}
              />
              <br />
              <div className="secteur-input">
                <p>Visibilité</p>
                {pieces.map((piece) => (
                  <label key={piece.ID} className="custom-checkbox">
                    <input
                      className="custom-checkbox-case"
                      type="checkbox"
                      placeholder={piece.libelle}
                      {...register(`piece_liste.${piece.ID}`, {
                        maxLength: 255,
                      })}
                    />
                    {piece.libelle}
                  </label>
                ))}
              </div>

              <br />
              <input className="submit" type="submit" value="Valider" />
            </form>
          </div>
        );
        break;

      case "Fournisseur":
        mainSubContent = (
          <div className="creation">
            <p>ici c&#39;est la création {subContent}</p>
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                className="custom-input"
                type="text"
                placeholder="Nom du fournisseur "
                {...register("newFournisseur", {
                  required: true,
                  maxLength: 255,
                })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Telephone"
                {...register("Telephone", { required: false, maxLength: 20 })}
              />
              <br />
              <input
                className="custom-input"
                type="Email"
                placeholder="Email"
                {...register("Email", { required: false, maxLength: 255 })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Site Web"
                {...register("Web", { required: false, maxLength: 255 })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Page récupération COA"
                {...register("COA", { required: false, maxLength: 255 })}
              />
              <br /> <br />
              <input className="submit" type="submit" value="Valider" />
            </form>
          </div>
        );
        break;
    }

    return mainSubContent;
  };

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
