import { useState } from "react";
import { checkCredentials, checkUser, createUser } from "./Composant/API/api";
import HomePage from "./Composant/Page/HomePage";

function App() {
  const [userState, setUserState] = useState({
    loggedIn: false,
    isAuthorized: false,
  });

  const [isRegistering, setIsRegistering] = useState(false);

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
    if (Email.endsWith("@a")) {
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
      alert("Vous devez utiliser un email @a");
    }
  };

  // Fonction de changement de page vers la page d'inscription
  const handleRegisterClick = () => {
    setIsRegistering(true);
  };

  const handleConnexion = () => {
    return (
      <main className="Connexion centered-element">
        <h1>Log in</h1>
        <br />
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
        <p>
          Besoin d&#39;un compte?
          <br />
          <button style={{ width: "25%" }} onClick={handleRegisterClick}>
            Cliquer ici
          </button>
        </p>
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
