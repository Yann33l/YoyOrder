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

    // Vérification de l'email
    if (Email.endsWith(import.meta.env.VITE_EMAIL_FINI_PAR)) {
      try {
        // Vérification de l'existence de l'utilisateur
        const response = await checkUser(Email);
        if (response.status === 200) {
          alert(
            "Utilisateur déjà existant merci de vous connecter ou de demander un nouveau mot de passe par mail au sevice informatique"
          );
        }
      } catch (error) {
        // Si l'utilisateur n'existe pas =>
        if (error.response && error.response.status === 404) {
          console.log("404 = Utilisateur inexistant => création");
          // Vérification de la correspondance des mots de passe
          if (Password !== ConfirmPassword) {
            alert("Les mots de passe ne correspondent pas");
          } else {
            await createUser(Email, Password);
            alert("Utilisateur créé");
            setIsRegistering(false);
          }
        } else {
          // Gérer les autres erreurs de requête ou de réseau
          alert("Une erreur est survenue");
        }
      }
    } else {
      alert(
        "Vous devez utiliser un email" + import.meta.env.VITE_EMAIL_FINI_PAR
      );
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
      <main className="Connexion centered-element">
        <div
          style={{
            border: "1px solid black",
            margin: "20px",
            borderRadius: "15px",
          }}
        >
          <h1>Log in</h1>
          <form onSubmit={handleLogin}>
            <label htmlFor="Email">
              Email
              <br />
            </label>
            <input
              id="Email"
              name="Email"
              type="email"
              placeholder="Email"
              autoComplete="email"
            />
            <br />
            <br />
            <label htmlFor="Password">
              Password
              <br />
            </label>
            <input
              id="Password"
              name="Password"
              type="password"
              placeholder="Mot de passe"
              autoComplete="off"
            />
            <br />
            <br />
            <button type="submit"> Connexion </button>
          </form>
          <br />
        </div>
        <button onClick={handleRegisterClick}>Creer un compte</button> <br />
        <button onClick={handleChangePasswordClick}>
          Mot de passe oublié ?
        </button>
      </main>
    );
  };

  // Rendu conditionnel en fonction de l'état isRegistering = Page d'inscription
  if (isRegistering) {
    return (
      <main className="Connexion centered-element">
        <h1>Inscription</h1>
        <p>
          Apres inscription votre compte doit etre activé par un administrateur
        </p>
        <form onSubmit={handleInscription}>
          <label htmlFor="Email">
            Email
            <br />
          </label>
          <input name="Email" type="email" placeholder="Email" />
          <br />
          <br />
          <label htmlFor="Password">
            Password
            <br />
          </label>
          <input name="Password" type="password" placeholder="Mot de passe" />
          <br />
          <label htmlFor="ConfirmPassword">
            Confirmation password
            <br />
          </label>
          <input
            name="ConfirmPassword"
            type="password"
            placeholder="Confirmation mot de passe"
          />
          <br />
          <button type="submit"> Valider </button>
          <br />
          <button
            id="reset"
            type="reset"
            onClick={() => setIsRegistering(false)}
          >
            Retour
          </button>
        </form>
      </main>
    );
  }

  // Pop-up de changement de mot de passe
  if (isChangingPassword) {
    return (
      <main className="Connexion centered-element">
        <h1>Changement du Password</h1>
        <p>
          Apres modification votre compte doit etre réactivé par un
          administrateur
        </p>
        <form onSubmit={handleEditPassword}>
          <label htmlFor="Email">
            Email
            <br />
          </label>
          <input name="Email" type="email" placeholder="Email" />
          <br />
          <br />
          <label htmlFor="newPassword">
            Password
            <br />
          </label>
          <input
            name="newPassword"
            type="password"
            placeholder="Mot de passe"
          />
          <br />
          <label htmlFor="confirmNewPassword">
            Confirmation password
            <br />
          </label>
          <input
            name="confirmNewPassword"
            type="password"
            placeholder="Confirmation mot de passe"
          />
          <br />
          <button type="submit"> Valider </button>
          <br />
          <button
            id="reset"
            type="reset"
            onClick={() => setIsChangingPassword(false)}
          >
            Retour
          </button>
        </form>
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
