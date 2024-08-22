const AcceuilContent = () => {
  return (
    <div className="acceuil">
      <h1>Présentation de l&apos;application Yoyorder</h1>
      <p>
        <strong>Yoyorder</strong> est une application conçue pour optimiser la
        gestion des commandes et des stocks dans un laboratoire comportant
        plusieurs unités. Cette plateforme centralisée permet de suivre et de
        réaliser l&apos;ensemble des processus liés à l&apos;acquisition, au
        stockage, et à la consommation des articles. Grâce à des rôles
        distincts, Yoyorder assure une gestion efficace et fluide des ressources
        du laboratoire.
      </p>

      <h2>Les rôles et fonctionnalités</h2>

      <h3>1. Demandeurs</h3>
      <p>
        Les <strong>Demandeurs</strong> sont chargés de formuler les besoins en
        articles au sein du laboratoire. Ils ont accès aux fonctionnalités
        suivantes :
      </p>
      <ul>
        <li>
          <strong>Saisie de nouvelles demandes d&apos;articles</strong> : Les
          Demandeurs peuvent ajouter des articles à la liste des besoins en
          précisant la quantité et la date de livraison souhaitée.
        </li>
        <li>
          <strong>Réception des articles</strong> : Ils enregistrent la date de
          réception, les quantités reçues, et les lots associés une fois les
          articles livrés.
        </li>
      </ul>

      <h3>2. Acheteurs</h3>
      <p>
        Les <strong>Acheteurs</strong> gèrent les commandes des articles auprès
        des fournisseurs. Leurs responsabilités incluent :
      </p>
      <ul>
        <li>
          <strong>Saisie de la date de commande</strong> : Ils enregistrent la
          date à laquelle chaque commande est passée pour assurer la
          traçabilité.
        </li>
        <li>
          <strong>Saisie du numéro de commande</strong> : Un numéro de commande
          unique est attribué à chaque transaction.
        </li>
        <li>
          <strong>Exportation des listes d&apos;articles à commander</strong> :
          Ils peuvent exporter des listes d&apos;articles à commander, avec des
          filtres basés sur les fournisseurs, facilitant ainsi la gestion des
          commandes.
        </li>
      </ul>

      <h3>3. Éditeurs</h3>
      <p>
        Les <strong>Éditeurs</strong> ont un rôle crucial dans la structuration
        et la mise à jour des informations de base de l&apos;application. Ils
        peuvent :
      </p>
      <ul>
        <li>
          <strong>Créer</strong> :
          <ul>
            <li>Des pièces (les différents locaux ou zones de stockage)</li>
            <li>
              Des secteurs (les différentes unités ou divisions du laboratoire)
            </li>
            <li>Des fournisseurs (les partenaires commerciaux)</li>
            <li>Des articles (les produits ou matériaux nécessaires)</li>
            <li>
              Des sous-articles (les variantes spécifiques des articles
              principaux)
            </li>
          </ul>
        </li>
        <li>
          <strong>Éditer</strong> :
          <ul>
            <li>Les pièces</li>
            <li>Les secteurs</li>
            <li>Les fournisseurs</li>
            <li>Les articles</li>
            <li>Les sous-articles</li>
          </ul>
        </li>
      </ul>

      <h3>4. Administrateurs</h3>
      <p>
        Les <strong>Administrateurs</strong> ont un accès complet à
        l&apos;ensemble du système via le panneau d&apos;administration, leur
        permettant de superviser la configuration de l&apos;application, la
        gestion des utilisateurs, et les permissions.
      </p>

      <h2>Fonctions additionnelles</h2>
      <p>
        En plus des fonctionnalités principales, Yoyorder propose des outils
        avancés pour un contrôle accru des processus :
      </p>
      <ul>
        <li>
          <strong>Suivi des quantités consommées</strong> : Yoyorder permet de
          suivre précisément les quantités d&apos;articles consommés,
          garantissant ainsi une gestion efficace des stocks.
        </li>
        <li>
          <strong>Suivi des lots consommés</strong> : Grâce à cette
          fonctionnalité, les utilisateurs peuvent suivre l&apos;ouverture et la
          fin d&apos;utilisation des lots reçus. Cela inclut
          l&apos;enregistrement des dates d&apos;ouverture et de fin
          d&apos;utilisation, assurant une traçabilité complète et une gestion
          optimisée des ressources.
        </li>
        <li>
          <strong>Gestion des certificats d&apos;analyses</strong> :
          L&apos;application permet également de gérer les certificats
          d&apos;analyses pour garantir que les produits reçus respectent les
          normes de qualité requises.
        </li>
      </ul>

      <p>
        <strong>Yoyorder</strong> se positionne ainsi comme une solution
        complète et intégrée pour la gestion des commandes et des stocks au sein
        des laboratoires, offrant des outils dédiés à chaque rôle et des
        fonctionnalités avancées pour un suivi rigoureux et une traçabilité
        optimale.
      </p>
    </div>
  );
};

export default AcceuilContent;
