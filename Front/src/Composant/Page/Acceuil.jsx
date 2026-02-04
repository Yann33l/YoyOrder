const AcceuilContent = () => {
  return (
    <div className="acceuil">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Tableau de bord</p>
          <h1>Bienvenue sur Yoyorder</h1>
          <p>
            La plateforme qui orchestre vos commandes, vos stocks et la
            traçabilité des lots pour toutes les unités du laboratoire.
          </p>
          <div className="dashboard-actions">
            <button className="dashboard-button primary">
              Créer une demande
            </button>
            <button className="dashboard-button secondary">
              Consulter le stock
            </button>
          </div>
        </div>
        <div className="dashboard-hero-card">
          <h2>À suivre aujourd’hui</h2>
          <ul>
            <li>12 demandes en attente de validation</li>
            <li>5 commandes en cours de livraison</li>
            <li>3 lots arrivent à expiration</li>
          </ul>
        </div>
      </section>

      <section className="dashboard-stats">
        <article className="stat-card teal">
          <p>Demandes ouvertes</p>
          <h3>48</h3>
          <span>+6 cette semaine</span>
        </article>
        <article className="stat-card coral">
          <p>Commandes actives</p>
          <h3>21</h3>
          <span>4 fournisseurs clés</span>
        </article>
        <article className="stat-card violet">
          <p>Stocks critiques</p>
          <h3>7</h3>
          <span>Réappro à lancer</span>
        </article>
        <article className="stat-card lime">
          <p>Lots tracés</p>
          <h3>134</h3>
          <span>Certificats à jour</span>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Rôles & missions clés</h2>
          <p>
            Chaque équipe dispose d&apos;outils adaptés pour accélérer les
            processus et sécuriser les données.
          </p>
        </div>
        <div className="role-grid">
          <article className="dashboard-card">
            <h3>Demandeurs</h3>
            <p>
              Centralisez les besoins, suivez les réceptions et alimentez les
              stocks en temps réel.
            </p>
            <ul>
              <li>Création rapide de demandes.</li>
              <li>Réception et traçabilité des lots.</li>
            </ul>
          </article>
          <article className="dashboard-card">
            <h3>Acheteurs</h3>
            <p>
              Pilotez les commandes fournisseurs, assurez les numéros de
              commande et les exports.
            </p>
            <ul>
              <li>Suivi des dates de commande.</li>
              <li>Exports filtrés par fournisseur.</li>
            </ul>
          </article>
          <article className="dashboard-card">
            <h3>Éditeurs</h3>
            <p>
              Maintenez la base de données à jour et adaptez les catalogues aux
              besoins du labo.
            </p>
            <ul>
              <li>Gestion des articles & sous-articles.</li>
              <li>Paramétrage des secteurs & pièces.</li>
            </ul>
          </article>
          <article className="dashboard-card">
            <h3>Administrateurs</h3>
            <p>
              Supervisez les accès, les rôles et la conformité globale des
              processus.
            </p>
            <ul>
              <li>Gestion des utilisateurs.</li>
              <li>Contrôle des permissions.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Fonctionnalités avancées</h2>
          <p>
            Gardez la maîtrise des stocks, des lots et des certifications grâce
            à un suivi complet.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Suivi des consommations</h3>
            <p>
              Mesurez l&apos;usage par secteur et anticipez les ruptures en
              quelques clics.
            </p>
          </article>
          <article className="feature-card">
            <h3>Traçabilité des lots</h3>
            <p>
              Enregistrez les dates d&apos;ouverture et de fin d&apos;usage pour
              chaque lot.
            </p>
          </article>
          <article className="feature-card">
            <h3>Certificats d&apos;analyse</h3>
            <p>
              Centralisez les documents qualité et sécurisez la conformité des
              produits reçus.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default AcceuilContent;
