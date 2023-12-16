import React, { useState, useEffect } from "react";
import TableUtilisateurs from "../Tableaux/Table_utilisateurs";
import {GetPiece} from "../API/api"

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
  // Fonctions pour gérer les clics des boutons et mettre à jour le contenu
  const handleButtonClick = (newContent) => {
    if (newContent === "Déconnexion") {
      // Handle logout
      setUserState({ loggedIn: false, isAdmin: false, isAuthorized: false });
    } else {
      // Handle other button clicks
      setContent(newContent);
    }
  };


  // Contenu du main basé sur l'état
  let mainContent;
  switch (content) {
    case "acceuil":
    case "default":
      mainContent = (
        <div style={{ marginLeft: 30, color: "white" }}>
          <h1>Présentation de l'application</h1>
          <h3>Lien vers le code source de l'application</h3>
          <a
            style={{ color: "#D4AF37" }}
            href="https://github.com/Yann33l/YoyOrder"
            target="_blank"
            rel="bookmark"
          >
            https://github.com/Yann33l/YoyOrder
          </a>
          <br />
          <br />
          <p>
            Cette application permet de visualiser les données de ventes de
            l'entreprise Goldenline pour permetre l'étude des comportements des
            clients.
          </p>
          <p>
            Nous sommes constamment engagés dans l'amélioration de notre
            application. Voici les prochaines fonctionnalités que nous prévoyons
            de mettre en place :
          </p>
          <ul>
            <li>
              Remplacement du système de login actuel par un système de token :
              Cette mise à jour améliorera la sécurité de l'application en
              remplaçant le processus de connexion traditionnel par un système
              basé sur des jetons d'authentification. /Fait
            </li>
            <li>
              Ajout d'une sélection multiple des lignes pour exporter les
              tableaux : Cette fonctionnalité permettra aux utilisateurs de
              sélectionner plusieurs lignes de données à la fois, simplifiant
              ainsi le processus d'exportation de tableaux pour des analyses
              ultérieures. /Fait
            </li>
          </ul>
          <h2>Mon projet professionel</h2>
          <p>
            Mon ambition professionnelle est de poursuivre mon apprentissage du
            développement web par le biais d'un contrat d'alternance, de
            préférence dans le domaine de la santé. Travailler dans le secteur
            de la santé est particulièrement important pour moi, car cela me
            permettrait de combiner ma passion pour le développement web et
            l’analyse de données dans un domaine d’utilité public générant
            toujours plus de données à analyser. Je suis déterminé à continuer à
            acquérir des compétences et à contribuer de manière significative au
            secteur de la santé.{" "}
          </p>
        </div>
      );
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
                  onClick={() => handleButtonClick(piece.ID)}
                >
                  {piece.libelle}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      );
      break;
    case "Graph1":
      mainContent = <div></div>;
      break;
    case "Graph2":
      mainContent = <div></div>;
      break;

    case "exporter":
      mainContent = (
        <div>
          <nav className="sous_menu-nav">
            <ul>
              <li
                className="bouton"
                onClick={() => handleButtonClick("Table1")}
              >
                Dépense par cathegorie et par CSP
              </li>
              <li
                className="bouton"
                onClick={() => handleButtonClick("Table2")}
              >
                Moyenne du pannier par CSP
              </li>
              <li
                className="bouton"
                onClick={() => handleButtonClick("Table3")}
              >
                Collecte
              </li>
              <li
                className="bouton"
                onClick={() => handleButtonClick("Table4")}
              >
                Vue ensemble
              </li>
            </ul>
          </nav>
        </div>
      );
      break;
    case "Table1":
      mainContent = (
        <div>
          <h1 style={{ color: "white" }}>Dépense par cathegorie et par CSP</h1>
        </div>
      );
      break;
    case "Table2":
      mainContent = (
        <div>
          <h1 style={{ color: "white" }}>moyenne du pannier par CSP</h1>
        </div>
      );
      break;
    case "Table3":
      mainContent = (
        <div>
          <h1 style={{ color: "white" }}>Collecte</h1>
        </div>
      );
      break;
    case "Table4":
      mainContent = (
        <div>
          <h1 style={{ color: "white" }}>Vue ensemble</h1>
        </div>
      );
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
      <header>
        <div id="logoheader">
          <img
            id="logo"
            alt="logo"
            src="/Brand_files/svg/logo-no-background.svg"
            height="120"
          />
        </div>
        <nav className="menu-nav">
          <ul>
            <li className="bouton" onClick={() => handleButtonClick("acceuil")}>
              Acceuil
            </li>
            <li
              className="bouton"
              onClick={() => handleButtonClick("Commande")}
            >
              Commande
            </li>
            <li
              className="bouton"
              onClick={() => handleButtonClick("exporter")}
            >
              Exporter
            </li>
            {isAdmin && (
              <li className="bouton" onClick={() => handleButtonClick("Admin")}>
                Admin
              </li>
            )}
      <li className="bouton" onClick={() => onLogout()}>
        Déconnexion
      </li>
          </ul>
        </nav>
      </header>

      <main className="ZoneTravail">{mainContent}</main>

      <footer>
        <p>réalisé par Yannick Leger</p>
      </footer>
    </div>
  );
}

export default HomePage;
