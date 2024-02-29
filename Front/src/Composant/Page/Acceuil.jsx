let AcceuilContent = (
  <div>
    <h1>Présentation personnelle</h1>
    <h3>Mon projet professionel</h3>
    <p>
      Mon ambition professionnelle est de poursuivre mon apprentissage dans le
      domaine du développement.
      <br /> Le choix de changer de métier découle de mon désir de mettre en
      relation mes compétences actuelles avec une passion grandissante pour le
      développement et l&#39;analyse de données.
      <br /> Actuellement, mon expérience dans la gestion de bases de données,
      la création de requêtes et la réalisation de tests fonctionnels pour les
      systèmes de gestion de laboratoire (SGL) a été enrichissante, mais je
      ressens le besoin d&#39;explorer plus en profondeur le domaine du
      développement informatique.
      <br /> Je suis déterminé à continuer à acquérir des compétences et à
      contribuer de manière significative au secteur de la santé. <br />
      Pour me préparer à cette transition, j&#39;ai suivi une formation en
      &quot;Bases de données et langage SQL&quot; financée par mon employeur,
      spécifiquement pour gérer le SGL. En suivant, j&#39;ai investi dans une
      seconde formation en &quot;Concepteur développeur de solutions
      digitales&quot; (RNCP36146) grâce à mon CPF, réalisée en dehors de mes
      heures de travail.
      <br />
      Ces formations ont renforcé ma détermination à m&#39;engager pleinement
      dans cette nouvelle voie, d&#39;où ma volonté de poursuivre ce projet de
      transition professionnelle à travers une alternance, afin d&#39;assurer un
      apprentissage optimal.
    </p>
    <br />
    <h1>Présentation de l&#39;application</h1>
    <h3>Lien vers le code source de l&#39;application</h3>
    <a
      href="https://github.com/Yann33l/YoyOrder"
      target="_blank"
      rel="bookmark noreferrer"
    >
      https://github.com/Yann33l/YoyOrder
    </a>
    <br /> <br />
    <p>
      Cette application vise à permettre le suvie et la réalisation de commande
      pour un laboratoire contenant plusieurs unitées
    </p>
    <p> Quatre roles sont présents</p>
    <ul>
      <li> Acheteurs </li>
      <li> Demandeurs </li>
      <li> Editeurs </li>
      <li> Administrateurs </li>
    </ul>
    <br />
    <h3>Les demandeurs peuvent : </h3>
    <ul>
      <li>Saisir des</li>
      <ul>
        <li>
          Nouvelles demande d&#39;articles (Ajout de quantité et date de
          demande)
        </li>
        <li>
          Receptionner des articles (Date de reception et checkbox si reception
          en totalité)
        </li>
      </ul>
    </ul>
    <h3> Les acheteurs peuvent : </h3>
    <ul>
      <li>Saisir la date de commande des articles</li>
      <li>
        Exporter des listes d&#39;articles à commander avec filtre possible sur
        fournisseur
      </li>
    </ul>
    <h3>Les Editeurs peuvent : </h3>
    <ul>
      <li>Creer des</li>
      <ul>
        <li> Pieces </li>
        <li> Secteurs </li>
        <li> Fournisseurs </li>
        <li> Articles </li>
      </ul>
    </ul>
    <ul>
      <li>Editer les </li>
      <ul>
        <li> Pieces </li>
        <li> Secteurs </li>
        <li> Fournisseurs </li>
        <li> Articles </li>
      </ul>
    </ul>
    <h3>Les Administrateurs peuvent : </h3>
    <ul>
      <li>Acceder au panneau d&#39;administration</li>
    </ul>
    <br /> <br />
    <p>Reste à faire V1:</p>
    <ul>
      <li>Implémenter les tests</li>
    </ul>
    <p>Reste à faire V2:</p>
    <ul>
      <li>Suivi des réceptions et des lots + gestion COA</li>
      <li>Implémenter une gestion de stock</li>
      <li>Implémenter un suivi des modifiactions (qui à fait quoi ?)</li>
    </ul>
  </div>
);

export default AcceuilContent;
