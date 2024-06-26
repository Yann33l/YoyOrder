import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  createData,
  GetActiveFournisseurs,
  GetActivesPieces,
} from "../API/api";
import TableArticles from "../Tableaux/Table_articles";

const Creation = () => {
  const [pieces, setPieces] = useState([]);
  const [subContent, setSubContent] = useState("default");
  const { register, handleSubmit, reset } = useForm();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [donneesPrisesEnCompte, setDonneesPrisesEnCompte] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedElement, setSelectedElement] = useState("Article");

  const menuItems = [
    { label: "Article", content: "Article" },
    { label: "Composition Article", content: "Composition Article" },
    { label: "Fournisseur", content: "Fournisseur" },
    { label: "Piece", content: "Piece" },
    { label: "Secteur", content: "Secteur" },
  ];

  useEffect(() => {
    (async () => {
      setPieces(await GetActivesPieces());
    })();
    (async () => {
      setFournisseurs(await GetActiveFournisseurs());
    })();
  }, []);

  useEffect(() => {
    reset();
  }, [subContent, reset]);

  const mainSubContentCreation = (subContent) => {
    const onSubmit = async (data) => {
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
          createData(data, "article");
          break;
        case "Composition Article":
          data.articles_ids = Array.from(selectedRows);
          createData(data, "compositionArticle");
          break;

        case "Fournisseur":
          await createData(data, "fournisseur");
          setFournisseurs(await GetActiveFournisseurs());
          break;
        case "Piece":
          await createData(data, "piece");
          setPieces(await GetActivesPieces());
          break;
        case "Secteur":
          await createData(data, "secteur");
          break;
      }
      setDonneesPrisesEnCompte(true);
      setTimeout(() => {
        setDonneesPrisesEnCompte(false);
      }, 700);
    };

    let mainSubContent;
    switch (subContent) {
      case "Article":
      case "default":
        mainSubContent = (
          <div
            className={`creation ${
              donneesPrisesEnCompte ? "created" : "creation"
            }`}
          >
            <br />
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
              <input
                className={`submit ${
                  donneesPrisesEnCompte ? "submited" : "submit"
                }`}
                type="submit"
                value={`${donneesPrisesEnCompte ? "Ajouté !" : "Valider"}`}
              />
            </form>
            <br />
          </div>
        );
        break;

      case "Composition Article":
        mainSubContent = (
          <div
            className={`creation ${
              donneesPrisesEnCompte ? "created" : "creation"
            }`}
          >
            <p>
              1- Selectionner les articles qui contiennent l&apos;élément à
              créer
            </p>
            <div>
              <TableArticles setSelectedRows={setSelectedRows} />
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <br />
              <p>2- Saisir les informations de l&apos;élément à créer</p>
              <input
                className="custom-input"
                type="text"
                placeholder="Nom de l'élément "
                {...register("libelle", {
                  required: true,
                  maxLength: 255,
                })}
              />
              <input
                className="custom-input"
                type="text"
                placeholder="Réference"
                {...register("ref", { required: true, maxLength: 255 })}
              />
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
              <br />{" "}
              <input
                className="custom-input"
                type="number"
                step="1"
                placeholder="Quantité"
                {...register("quantite", {
                  required: true,
                })}
              />
              <br />
              <input
                className={`submit ${
                  donneesPrisesEnCompte ? "submited" : "submit"
                }`}
                type="submit"
                value={`${donneesPrisesEnCompte ? "Ajouté !" : "Valider"}`}
              />
            </form>
            <br />
          </div>
        );
        break;

      case "Fournisseur":
        mainSubContent = (
          <div
            className={`creation ${
              donneesPrisesEnCompte ? "created" : "creation"
            }`}
          >
            <br />
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                className="custom-input"
                type="text"
                placeholder="Nom du fournisseur "
                {...register("libelle", {
                  required: true,
                  maxLength: 255,
                })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Telephone"
                {...register("telephone", { required: false, maxLength: 20 })}
              />
              <br />
              <input
                className="custom-input"
                type="Email"
                placeholder="Email"
                {...register("email", { required: false, maxLength: 255 })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Site Web"
                {...register("siteWeb", { required: false, maxLength: 255 })}
              />
              <br />
              <input
                className="custom-input"
                type="text"
                placeholder="Page récupération COA"
                {...register("getCertificatAnalyse", {
                  required: false,
                  maxLength: 255,
                })}
              />
              <br /> <br />
              <input
                className={`submit ${
                  donneesPrisesEnCompte ? "submited" : "submit"
                }`}
                type="submit"
                value={`${donneesPrisesEnCompte ? "Ajouté !" : "Valider"}`}
              />
            </form>
            <br />
          </div>
        );
        break;
      case "Piece":
      case "Secteur":
        mainSubContent = (
          <div
            className={`creation ${
              donneesPrisesEnCompte ? "created" : "creation"
            }`}
          >
            <br />
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                className="custom-input"
                type="text"
                placeholder={subContent}
                {...register("libelle", {
                  required: true,
                  maxLength: 255,
                })}
              />
              <br /> <br />
              <input
                className={`submit ${
                  donneesPrisesEnCompte ? "submited" : "submit"
                }`}
                type="submit"
                value={`${donneesPrisesEnCompte ? "Ajouté !" : "Valider"}`}
              />
            </form>
            <br />
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

export default Creation;
