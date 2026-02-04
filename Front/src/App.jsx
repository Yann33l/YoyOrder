import { useState } from "react";
import {
  checkCredentials,
  checkUser,
  createUser,
  editPassword,
} from "./Composant/API/api";
import HomePage from "./Composant/Page/HomePage";

function App() {
  const [userState, setUserState] = useState({
    loggedIn: false,
    isAuthorized: false,
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fonction de connexion
  const handleLogin = async (event) => {
    event.preventDefault();

    const Email = event.target.elements.Email.value;
    const Password = event.target.elements.Password.value;

    try {
      const data = await checkCredentials(Email, Password);
      setUserState({
        loggedIn: true,
        isAuthorized: data.Autorisation,
      });
    } catch (error) {
      alert("Utilisateur ou mot de passe incorrect");
    }
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setUserState({
      loggedIn: false,
      isAuthorized: false,
    });
  };

  // Fonction d'inscription
  const handleInscription = async (event) => {
  event.preventDefault();

  const Email = event.target.elements.Email.value;
  const Password = event.target.elements.Password.value;
  const ConfirmPassword = event.target.elements.ConfirmPassword.value;

  if (!Email.endsWith(import.meta.env.VITE_EMAIL_FINI_PAR)) {
    alert(
      "Vous devez utiliser un email " + import.meta.env.VITE_EMAIL_FINI_PAR
    );
    return;
  }

  if (Password !== ConfirmPassword) {
    alert("Les mots de passe ne correspondent pas");
    return;
  }

  try {
    const response = await checkUser(Email);

    // Utilisateur existant
    if (response.status === 200) {
      alert(
        "Utilisateur déjà existant merci de vous connecter ou de demander un nouveau mot de passe"
      );
      return;
    }
  } catch (error) {
    // Utilisateur inexistant
    if (error.response?.status === 404) {
      await createUser(Email, Password);
      alert("Utilisateur créé");
      setIsRegistering(false);
      return;
    }

    console.error("Erreur checkUser :", error);
    alert("Une erreur est survenue");
  }
};

  // Fonction de changement de page vers la page d'inscription
  const handleRegisterClick = () => {
    setIsRegistering(true);
  };

  // Fonction de changement de page vers la page de changement de mot de passe
  const handleChangePasswordClick = () => {
    setIsChangingPassword(true);
  };

  // Fonction pour soumettre le nouveau mot de passe
  const handleEditPassword = async (event) => {
    event.preventDefault();

    const email = event.target.elements.Email.value;
    const newPassword = event.target.elements.newPassword.value;
    const confirmNewPassword = event.target.elements.confirmNewPassword.value;
    if (newPassword !== confirmNewPassword) {
      alert("Les nouveaux mots de passe ne correspondent pas");
    }
    try {
      const response = await checkUser(email);
      if (response.status === 200) {
        await editPassword(email, newPassword);
        alert("Mot de passe modifié avec succès. Vous devez vous reconnecter.");
        setUserState({ loggedIn: false });
        setIsChangingPassword(false);
      }
    } catch (error) {
      alert("Utilisateur inconnu");
    }
  };

  const handleConnexion = () => {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <header className="auth-header">
            <p className="auth-kicker">Yoyorder</p>
            <h1>Connexion</h1>
            <p className="auth-subtitle">
              Connectez-vous pour piloter vos commandes, vos stocks et la
              traçabilité de vos lots.
            </p>
          </header>
          <form className="auth-form" onSubmit={handleLogin}>
            <label htmlFor="Email">Email</label>
            <input
              id="Email"
              name="Email"
              type="email"
              placeholder="nom@laboratoire.fr"
              autoComplete="email"
              required
            />
            <label htmlFor="Password">Mot de passe</label>
            <input
              id="Password"
              name="Password"
              type="password"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              required
            />
            <button className="button-primary" type="submit">
              Se connecter
            </button>
          </form>
          <div className="auth-actions">
            <button className="button-secondary" onClick={handleRegisterClick}>
              Créer un compte
            </button>
            <button
              className="button-link"
              onClick={handleChangePasswordClick}
            >
              Mot de passe oublié ?
            </button>
          </div>
        </section>
        <aside className="auth-panel">
          <h2>Un poste de pilotage clair</h2>
          <p>
            Centralisez les demandes, les achats et les stocks grâce à une vue
            partagée par toutes les équipes.
          </p>
          <ul>
            <li>Suivi en temps réel des commandes et réceptions.</li>
            <li>Historique des lots et certificats d&apos;analyse.</li>
            <li>Rôles et permissions adaptés à chaque équipe.</li>
          </ul>
        </aside>
      </main>
    );
  };

  // Rendu conditionnel en fonction de l'état isRegistering = Page d'inscription
  if (isRegistering) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <header className="auth-header">
            <p className="auth-kicker">Yoyorder</p>
            <h1>Inscription</h1>
            <p className="auth-subtitle">
              Après inscription, votre compte doit être activé par un
              administrateur.
            </p>
          </header>
          <form className="auth-form" onSubmit={handleInscription}>
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              name="Email"
              type="email"
              placeholder="nom@laboratoire.fr"
              required
            />
            <label htmlFor="register-password">Mot de passe</label>
            <input
              id="register-password"
              name="Password"
              type="password"
              placeholder="Choisissez un mot de passe"
              required
            />
            <label htmlFor="register-confirm">
              Confirmation du mot de passe
            </label>
            <input
              id="register-confirm"
              name="ConfirmPassword"
              type="password"
              placeholder="Confirmez votre mot de passe"
              required
            />
            <button className="button-primary" type="submit">
              Valider l&apos;inscription
            </button>
          </form>
          <div className="auth-actions">
            <button
              id="reset"
              className="button-secondary"
              type="reset"
              onClick={() => setIsRegistering(false)}
            >
              Retour à la connexion
            </button>
          </div>
        </section>
        <aside className="auth-panel">
          <h2>Une base saine dès le départ</h2>
          <p>
            Les administrateurs valident les accès pour garantir la conformité
            des processus et des données.
          </p>
          <ul>
            <li>Création rapide des profils de demandeurs.</li>
            <li>Traçabilité complète des actions réalisées.</li>
            <li>Accès sécurisé par rôle métier.</li>
          </ul>
        </aside>
      </main>
    );
  }

  // Pop-up de changement de mot de passe
  if (isChangingPassword) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <header className="auth-header">
            <p className="auth-kicker">Yoyorder</p>
            <h1>Réinitialiser le mot de passe</h1>
            <p className="auth-subtitle">
              Après modification, votre compte doit être réactivé par un
              administrateur.
            </p>
          </header>
          <form className="auth-form" onSubmit={handleEditPassword}>
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              name="Email"
              type="email"
              placeholder="nom@laboratoire.fr"
              required
            />
            <label htmlFor="newPassword">Nouveau mot de passe</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Nouveau mot de passe"
              required
            />
            <label htmlFor="confirmNewPassword">
              Confirmation du mot de passe
            </label>
            <input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              placeholder="Confirmez le mot de passe"
              required
            />
            <button className="button-primary" type="submit">
              Mettre à jour
            </button>
          </form>
          <div className="auth-actions">
            <button
              id="reset"
              className="button-secondary"
              type="reset"
              onClick={() => setIsChangingPassword(false)}
            >
              Retour à la connexion
            </button>
          </div>
        </section>
        <aside className="auth-panel">
          <h2>Restez maître de vos accès</h2>
          <p>
            Sécurisez votre compte avec un nouveau mot de passe et maintenez la
            conformité avec votre équipe d&apos;administration.
          </p>
          <ul>
            <li>Processus simple, guidé pas à pas.</li>
            <li>Validation administrative pour plus de sécurité.</li>
            <li>Accès rapide une fois confirmé.</li>
          </ul>
        </aside>
      </main>
    );
  }

  if (userState.loggedIn && userState.isAuthorized) {
    return <HomePage onLogout={handleLogout} />;
  } else if (userState.loggedIn && !userState.isAuthorized) {
    alert("Votre compte n'est pas encore activé par un administrateur");
    setUserState({ loggedIn: false, isAuthorized: false });
    return handleConnexion();
  } else {
    return handleConnexion();
  }
}

export default App;
