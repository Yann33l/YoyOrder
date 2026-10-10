# Demandes et affectations

Les rôles définissent les actions autorisées : Demandeur pour demander et réceptionner, Acheteur pour commander, Éditeur pour créer les référentiels. Le statut administrateur permet de gérer les accès sans attribuer automatiquement ces rôles.

Dans **Administration → Rôles**, l’administrateur crée des rôles nommés (Technicien ACP, Technicien PAM, etc.), choisit leurs permissions métier, puis leurs secteurs et pièces visibles. Dans **Administration → Utilisateurs**, il attribue un ou plusieurs rôles aux comptes. Les permissions et les listes de visibilité des rôles attribués se cumulent. Un article doit correspondre à un secteur et une pièce autorisés. Les listes vides ne donnent aucune visibilité. Un administrateur voit l’ensemble du catalogue mais ses actions métier restent soumises aux permissions attribuées.

Les comptes existants sans rôle personnalisé conservent leurs permissions et affectations précédentes. Dès qu’un rôle est attribué, les permissions et visibilités proviennent des rôles, et les anciennes cases ne donnent plus d’accès supplémentaires. Un éditeur ne peut pas modifier un article partagé avec des secteurs ou pièces hors de son périmètre.

Le panneau **Utilisateurs** permet de créer, activer ou désactiver les comptes, attribuer leurs rôles et fixer leur **fin de validité**. La date est incluse selon le calendrier de Paris : le lendemain, l’accès métier est bloqué côté serveur et le compte apparaît dans le filtre **Archivés**. Les données et les demandes associées sont conservées. Pour rétablir l’accès, activez le compte et modifiez ou retirez la date de fin. Un administrateur ne peut pas désactiver ou archiver son propre compte.

La création d’un compte demande un email et un mot de passe initial d’au moins 12 caractères, haché par Wasp. Le compte doit encore vérifier son email : le panneau affiche un lien valable 30 minutes à transmettre à l’utilisateur. Aucun email n’est envoyé automatiquement. L’utilisateur peut ensuite changer son mot de passe via le parcours de réinitialisation habituel.

Les **Référentiels** sont organisés en cinq onglets : **Fournisseurs**, **Secteurs**, **Pièces**, **Articles** et **Compositions (sous-articles)**. Chaque onglet permet de créer et modifier ses éléments avec le rôle Éditeur.

Dans **Référentiels → Articles**, les cases **Secteurs compatibles** et **Pièces** permettent plusieurs choix à la création et à la modification. Au moins un secteur doit être associé à l’article.

Dans **Compositions (sous-articles)**, choisissez l’article parent, puis ajoutez les sous-articles et leur quantité par article. Vous pouvez modifier la quantité ou retirer un sous-article de la composition sans supprimer sa fiche du référentiel.

La page **Demandes** présente les articles accessibles, y compris ceux qui n’ont pas encore de demande. Le sous-menu permet de choisir une pièce ou toutes les pièces. Un article associé à plusieurs pièces apparaît dans chacune d’elles.

Chaque colonne de secteur permet de saisir sa quantité. Les secteurs incompatibles avec l’article affichent un tiret. Le bouton **Envoyer** enregistre une seule demande pour l’article, avec les quantités des secteurs renseignés, la date et le commentaire. Les quantités nulles ne créent pas de demande. Les saisies sont conservées lors d’un changement de pièce ; les demandes envoyées apparaissent sous la grille.

Les accès et compatibilités sont contrôlés côté serveur, y compris si un utilisateur tente d’envoyer directement une requête.

## Commandes fournisseur

La page **Commandes** affiche les demandes qui n’ont pas encore de date de commande. Le filtre fournisseur et les filtres des colonnes permettent de trouver les articles à commander.

Cochez les lignes en première colonne. La case d’en-tête sélectionne toutes les demandes correspondant aux filtres, sur toutes les pages. Le formulaire **Commande commune** liste les demandes choisies, puis permet de leur appliquer une date, un numéro et un commentaire identiques. Un changement de fournisseur vide la sélection.

Les articles sélectionnés doivent appartenir au même fournisseur. La date choisie doit être égale ou postérieure à la date de chacune des demandes. L’enregistrement est transactionnel : si une demande n’est plus en attente ou n’est pas autorisée, la sélection entière est refusée. Les demandes enregistrées quittent la liste en attente et apparaissent dans **Commandes déjà enregistrées**.

## Réceptions depuis le tableau

Dans **Réceptions et stock**, la grille **Articles en attente de réception** liste les commandes fournisseur non entièrement reçues. Elle affiche les quantités commandées, déjà reçues et restant à recevoir, avec recherche, pagination et filtre fournisseur.

Sur chaque ligne, saisissez la quantité reçue, la date, le numéro de lot, la péremption éventuelle, le certificat PDF et le commentaire, puis cliquez sur **Réceptionner**. Une réception partielle conserve la commande dans la grille ; une réception complète la retire. La quantité ne peut pas dépasser le reste, la réception ne peut pas précéder la commande et la péremption ne peut pas précéder la réception.

## Historique des commandes et lots

L’onglet **Historique** est accessible aux demandeurs, acheteurs et administrateurs. Il conserve toutes les demandes et commandes, avec une ligne par réception et lot, y compris les lots épuisés ou périmés. Les commandes sans réception sont également affichées.

La grille regroupe l’article, le fournisseur, les quantités par secteur, le demandeur, les dates de demande et de commande, la réception, les commentaires, le lot, les quantités initiales et restantes, les dates d’utilisation et de péremption. Les certificats d’analyse PDF se téléchargent depuis leur ligne. Les champs non renseignés restent vides.

La recherche globale, les filtres par colonne, la pagination et l’export CSV permettent de retrouver les anciens enregistrements. Les utilisateurs restent limités à leurs secteurs ; les administrateurs peuvent consulter l’ensemble. Cette vue présente les données enregistrées, sans journal des modifications successives.
