# Demandes et affectations

Les rôles définissent les actions autorisées : Demandeur pour demander et réceptionner, Acheteur pour commander, Éditeur pour créer les référentiels. Le statut administrateur permet de gérer les accès sans attribuer automatiquement ces rôles.

Les affectations aux secteurs (ACP, PAM, etc.) définissent le périmètre des utilisateurs. Dans **Vue d’ensemble → Accès utilisateurs**, l’administrateur coche les rôles et les affectations, puis enregistre. L’utilisateur voit uniquement les articles compatibles avec ses secteurs et les pièces contenant ces articles. Un administrateur voit l’ensemble du catalogue.

Dans **Référentiels → Créer un article**, les cases **Secteurs compatibles** et **Pièces** permettent plusieurs choix. Au moins un secteur doit être associé à l’article.

La page **Demandes** présente les articles accessibles, y compris ceux qui n’ont pas encore de demande. Le sous-menu permet de choisir une pièce ou toutes les pièces. Un article associé à plusieurs pièces apparaît dans chacune d’elles.

Chaque colonne de secteur permet de saisir sa quantité. Les secteurs incompatibles avec l’article affichent un tiret. Le bouton **Envoyer** enregistre une seule demande pour l’article, avec les quantités des secteurs renseignés, la date et le commentaire. Les quantités nulles ne créent pas de demande. Les saisies sont conservées lors d’un changement de pièce ; les demandes envoyées apparaissent sous la grille.

Les accès et compatibilités sont contrôlés côté serveur, y compris si un utilisateur tente d’envoyer directement une requête.

## Commandes fournisseur

La page **Commandes** affiche les demandes qui n’ont pas encore de date de commande. Le filtre fournisseur et les filtres des colonnes permettent de trouver les articles à commander.

Cochez les lignes en première colonne. La case d’en-tête sélectionne toutes les demandes correspondant aux filtres, sur toutes les pages. Le formulaire **Commande commune** liste les demandes choisies, puis permet de leur appliquer une date, un numéro et un commentaire identiques. Un changement de fournisseur vide la sélection.

Les articles sélectionnés doivent appartenir au même fournisseur. La date choisie doit être égale ou postérieure à la date de chacune des demandes. L’enregistrement est transactionnel : si une demande n’est plus en attente ou n’est pas autorisée, la sélection entière est refusée. Les demandes enregistrées quittent la liste en attente et apparaissent dans **Commandes déjà enregistrées**.
