// eslint-disable-next-line react/prop-types
let Headers = ({ onClick, isAdmin2, onLogout2 }) => (
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
        <li className="bouton" onClick={() => onClick("acceuil")}>
          Acceuil
        </li>
        <li className="bouton" onClick={() => onClick("Commande")}>
          Commande
        </li>
        <li className="bouton" onClick={() => onClick("Creation")}>
          Creation
        </li>
        {isAdmin2 && (
          <li className="bouton" onClick={() => onClick("Admin")}>
            Admin
          </li>
        )}
        <li className="bouton" onClick={() => onLogout2()}>
          Déconnexion
        </li>
      </ul>
    </nav>
  </header>
);

export default Headers;
