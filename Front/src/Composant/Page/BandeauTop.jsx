import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getUserInfo } from "../API/api";

const Headers = ({ setContent, onLogout }) => {
  const [isEditeur, setIsEditeur] = useState();
  const [isDemandeur, setIsDemandeur] = useState();
  const [isAcheteur, setIsAcheteur] = useState();
  const [isAdmin, setIsAdmin] = useState();
  const [selectedElement, setSelectedElement] = useState("Acceuil");
  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getUserInfo();
        setIsAcheteur(userData.Acheteur || false);
        setIsAdmin(userData.Admin || false);
        setIsDemandeur(userData.Demandeur || false);
        setIsEditeur(userData.Editeur || false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setNavItems([
      { label: "Acceuil", content: "acceuil", condition: true },
      { label: "Demandes", content: "Demande", condition: isDemandeur },
      { label: "Commandes", content: "Commande", condition: isAcheteur },
      { label: "Réceptions", content: "Reception", condition: isDemandeur },
      { label: "Historique", content: "Historique", condition: isDemandeur },
      { label: "Creations", content: "Creation", condition: isEditeur },
      { label: "Editions", content: "Edition", condition: isEditeur },
      { label: "Admin", content: "Admin", condition: isAdmin },
    ]);
  }, [isDemandeur, isAcheteur, isEditeur, isAdmin]);

  const handleItemClick = (content, element) => {
    setContent(content);
    setSelectedElement(element);
  };

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
          {navItems.map((item, index) => {
            if (item.condition) {
              return (
                <li
                  key={index}
                  className={`bouton ${
                    selectedElement === item.label ? "selected" : ""
                  }`}
                  onClick={() => handleItemClick(item.content, item.label)}
                >
                  {item.label}
                </li>
              );
            }
            return null;
          })}
          <li className="bouton" onClick={() => onLogout()}>
            Déconnexion
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Headers;
Headers.propTypes = {
  setContent: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};
