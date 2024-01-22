import PropTypes from "prop-types";

let Headers = ({ setContent, isAdmin, onLogout }) => (
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
        <li className="bouton" onClick={() => setContent("Commande")}>
          Commande
        </li>
        <li className="bouton" onClick={() => setContent("Demande")}>
          Demande
        </li>
        <li className="bouton" onClick={() => setContent("Creation")}>
          Creation
        </li>
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
Headers.propTypes = {
  setContent: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  onLogout: PropTypes.func.isRequired,
};
export default Headers;
