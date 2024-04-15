let AcceuilContent = (
  <div>
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
          Receptionner des articles (Date de receptions, quantités et lots
          réceptionnés)
        </li>
      </ul>
    </ul>
    <h3> Les acheteurs peuvent : </h3>
    <ul>
      <li>Saisir la date de commande des articles</li>
      <li>Saisir le numéro de commande</li>
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
        <li> Sous articles </li>
      </ul>
    </ul>
    <ul>
      <li>Editer les </li>
      <ul>
        <li> Pieces </li>
        <li> Secteurs </li>
        <li> Fournisseurs </li>
        <li> Articles </li>
        <li> Sous articles </li>
      </ul>
    </ul>
    <h3>Les Administrateurs peuvent : </h3>
    <ul>
      <li>Acceder au panneau d&#39;administration</li>
    </ul>
  </div>
);

export default AcceuilContent;
