# Migration YoyOrder vers Open SaaS

## Modèle cible

Le modèle Prisma se trouve dans `app/schema.prisma`. Il conserve les fonctions d'Open SaaS et ajoute les entités YoyOrder :

| Ancienne table MySQL | Modèle Prisma | Remarques |
| --- | --- | --- |
| `users` | `User` | Les rôles acheteur, demandeur, éditeur et autorisé sont des booléens; l'authentification et l'identifiant sont gérés par Wasp. |
| `secteurs`, `r_user_secteur` | `Sector`, `UserSector` | Relation utilisateur-secteur explicite. |
| `piece` | `Piece` | Les pièces de stockage. |
| `fournisseurs` | `Supplier` | Coordonnées et dates de validité. |
| `articles` | `Article` | Liens fournisseur, secteurs, pièces et sous-articles. |
| `r_articles_secteurs`, `r_articles_pieces` | `ArticleSector`, `ArticlePiece` | Tables de liaison. |
| `sous_articles`, `r_articles_sous_articles` | `SubArticle`, `ArticleSubArticle` | Quantité de composition conservée. |
| `commandes`, `r_secteur_commande` | `Order`, `OrderSector` | Demande, commande, commentaires et quantités par secteur. |
| `sous_commandes` | `SubOrder` | Lignes commandées pour les sous-articles. |
| `receptions` | `Reception` | Dates, quantités et commentaires de réception et d'utilisation. |
| `stocks`, `r_reception_stock` | `Stock`, `ReceptionStock` | Lot, péremption, quantités et certificat d'analyse binaire. |

Les identifiants du modèle cible sont des entiers pour les référentiels et objets métier. L'import devra conserver les anciens identifiants puis recalibrer les séquences PostgreSQL après chargement. Les dates MySQL doivent être converties en dates/horodatages PostgreSQL.

## Ordre de migration des données

1. Exporter une sauvegarde cohérente de MySQL; ne jamais importer dans la base de production en premier.
2. Charger les utilisateurs, secteurs, pièces et fournisseurs en conservant leurs identifiants.
3. Charger articles, sous-articles et tables de relation.
4. Charger commandes et lignes, puis réceptions, stocks et relations de certificats.
5. Vérifier les volumes, clés étrangères, quantités et quelques historiques de lots avant toute bascule.

Les tables source sont décrites dans `Back/models.py` de l'ancienne branche `dev` (consultable avec `git show dev:Back/models.py`). Cette branche Open SaaS ne contient plus l'ancienne application. Le modèle cible est une première cartographie : vérifier en particulier la sémantique de `commandes.article_id` et de `receptions.sous_commande_id` avec les données réelles avant d'écrire l'import définitif.

## Comptes et pièces jointes

Wasp possède son propre modèle de sessions et de credentials. Les anciens mots de passe bcrypt stockés dans `users.Password` ne sont pas importés dans le mécanisme Wasp. Prévoir une invitation ou une réinitialisation de mot de passe pour chaque utilisateur, tout en important ses rôles, son autorisation et ses secteurs. Les comptes nouvellement inscrits restent désactivés; seul un administrateur configuré dans `ADMIN_EMAILS` reçoit les droits d'administrateur et l'accès initial.

Les certificats d'analyse stockés dans `stocks.COA` sont représentés par `Stock.coa` (`Bytes`) pour préserver leur contenu lors d'un premier import. L'usage du stockage S3 intégré au boilerplate pourra ensuite remplacer ce stockage en base si nécessaire.

## Parcours à porter

Déjà implémentés dans `app/src/inventory/` : demandes par article et secteur, saisie acheteur du numéro/date de commande, réceptions partielles avec lot et certificat PDF, mise à jour de la quantité restante, création d'articles/fournisseurs/secteurs/pièces, activation et attribution des rôles/secteurs aux comptes. Les opérations filtrent les données par secteurs affectés et vérifient les rôles côté serveur.

Restent à porter avant une bascule complète :

- Édition et désactivation des fournisseurs, articles, pièces et secteurs (seule leur création est actuellement câblée).
- Composition des articles en sous-articles, gestion des sous-commandes et réception par ligne de sous-article.
- Suivi complet des réceptions et mouvements, y compris les dates d'ouverture et de fin d'utilisation.
- Historique consultable des demandes, commandes, réceptions et modifications.
- Import reproductible des données MySQL, traitement des comptes existants et réinitialisation des mots de passe.
- Validation fonctionnelle de tous les rôles, secteurs et parcours sur une base PostgreSQL migrée.
- Paramétrage et déploiement du nouvel environnement, procédure de retour arrière et décision de coupure de l'ancien service.

Chaque opération Wasp doit faire les contrôles de rôle et de secteur côté serveur. Le masquage d'éléments dans React ne remplace pas ces contrôles.

## Bascule

Le socle Open SaaS et les premiers parcours YoyOrder sont intégrés dans `app/`. La branche `feat/open-saas-clean` retire les anciens dossiers `Back/` et `Front/`, les dépendances Python et le `Procfile` FastAPI ; l'ancienne version reste dans l'historique Git de `dev`. La bascule de production attend la parité des parcours restants, un outil d'import reproductible depuis un export MySQL, une validation fonctionnelle et une stratégie de retour à l'ancienne application. Le nouveau projet Wasp n'a pas encore été compilé ici (WSL renvoie `ACCESS_DENIED`). Les déploiements existants (Scalingo/Vercel) et la base en production ne sont pas reconfigurés par ces changements.
