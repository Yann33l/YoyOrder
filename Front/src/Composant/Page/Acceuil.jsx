let AcceuilContent = (
  <div style={{ marginLeft: 30, color: "white" }}>
    <h1>Présentation de l&#39;application</h1>
    <h3>Lien vers le code source de l&#39;application</h3>
    <a
      style={{ color: "#D4AF37" }}
      href="https://github.com/Yann33l/YoyOrder"
      target="_blank"
      rel="bookmark noreferrer"
    >
      https://github.com/Yann33l/YoyOrder
    </a>
    <br />
    <br />
    <p>
      Cette application vise à permettre le suvie et la réalisation de commande
      pour un laboratoire contenant plusieurs unitées
    </p>
    <p> Trois types d&#39;utilisateurs </p>
    <ul>
      <li> Acheteurs </li>
      <li> Utilisateurs </li>
      <li> Administrateurs </li>
    </ul>{" "}
    Voir pour passer les details de chaque utilisateurs en fenetre qui
    s&#39;ettand au clic sur l&#39;utilisateur
    <br /> <br />
    <br /> <br />
    <p>Les Utilisateurs peuvent : </p>
    <ul>
      <li>creer des</li>{" "}
      <ul>
        <li> lieux de stockages </li>
        <li> Fournisseurs </li>
        <li> Articles </li>
      </ul>{" "}
    </ul>
    <ul>
      <li>saisir des</li>{" "}
      <ul>
        <li> nouvelles demande d&#39;articles </li>
        <li> Receptionner des articles </li>
      </ul>{" "}
    </ul>{" "}
    <ul>
      <li>Consulter et exporter les</li>{" "}
      <ul>
        <li>
          {" "}
          Etat des commandes avec filtre possible sur fournisseur/Secteurs{" "}
        </li>
        <li> Historique de commande </li>
        <li> Etat des stocks </li>
      </ul>{" "}
    </ul>{" "}
    <br /> <br />
    <p> Les Acheteurs peuvent : </p>
    <ul>
      <li>Consulter et exporter les</li>{" "}
      <ul>
        <li> Articles à commander avec filtre possible sur fournisseur </li>
        <li> Historique de commande </li>
        <li> Etat des stocks </li>
      </ul>{" "}
    </ul>
    <ul>
      <li>saisir des</li>{" "}
      <ul>
        <li> Nouvelles demande d&#39;articles </li>
      </ul>{" "}
    </ul>
    <br /> <br />
    <p>Les Administrateurs peuvent : </p>
    <ul>
      <li>Acceder au panneau d&#39;administration</li>{" "}
    </ul>
    <br />
    <p>Logique de fonctionnement de l&#39;application : </p>
    <ul>
      <li> Chaque unité doit avoir la vision sur ces réactifs uniquement </li>
      <li> Un réactif peut etre visible par plusieurs unitées </li>
      <li> La réception d&#39;un réactif met à jours le stock</li>
    </ul>
    <h2>Mon projet professionel</h2>
    <p>
      Mon ambition professionnelle est de poursuivre mon apprentissage du
      développement web par le biais d&#39;un contrat d&#39;alternance, de
      préférence dans le domaine de la santé. Travailler dans le secteur de la
      santé est particulièrement important pour moi, car cela me permettrait de
      combiner ma passion pour le développement web et l’analyse de données dans
      un domaine d’utilité public générant toujours plus de données à analyser.
      Je suis déterminé à continuer à acquérir des compétences et à contribuer
      de manière significative au secteur de la santé.{" "}
    </p>
  </div>
);

export default AcceuilContent;
