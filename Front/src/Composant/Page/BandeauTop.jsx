import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getUserInfo } from "../API/api";

const Headers = ({ setContent, onLogout }) => {
  const [isEditeur, setIsEditeur] = useState(false);
  const [isDemandeur, setIsDemandeur] = useState(false);
  const [isAcheteur, setIsAcheteur] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getUserInfo();
        setIsAcheteur(userData.Acheteur);
        setIsAdmin(userData.Admin);
        setIsDemandeur(userData.Demandeur);
        setIsEditeur(userData.Editeur);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  return (
    <header className="BandeauTop">
      <nav className="menu-nav">
        <div id="logoheader">
          <img
            id="logo"
            alt="logo"
            src="/Brand_files/png/logo_yoyorder.png"
            height="120"
          />
        </div>
        <ul>
          <li className="bouton" onClick={() => setContent("acceuil")}>
            Acceuil
          </li>
          {isDemandeur && (
            <li className="bouton" onClick={() => setContent("Demande")}>
              Demandes
            </li>
          )}
          {isAcheteur && (
            <li className="bouton" onClick={() => setContent("Commande")}>
              Commandes
            </li>
          )}
          {isDemandeur && (
            <li className="bouton" onClick={() => setContent("Reception")}>
              Réceptions
            </li>
          )}
          {isDemandeur && (
            <li className="bouton" onClick={() => setContent("Historique")}>
              Historique
            </li>
          )}
          {isEditeur && (
            <li className="bouton" onClick={() => setContent("Creation")}>
              Creations
            </li>
          )}
          {isEditeur && (
            <li className="bouton" onClick={() => setContent("Edition")}>
              Editions
            </li>
          )}
          {isAdmin && (
            <li className="bouton" onClick={() => setContent("Admin")}>
              Admin
            </li>
          )}
          <li className="bouton" onClick={() => onLogout()}>
            Déconnexion
          </li>
        </ul>
      </nav>
    </header>
  );
};
Headers.propTypes = {
  setContent: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Headers;
