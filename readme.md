# YoyOrder

Application de gestion des demandes, commandes et stocks d'un laboratoire. Le nouveau socle est [Open SaaS](https://github.com/wasp-lang/open-saas), basé sur Wasp, React, Node.js, Prisma et PostgreSQL.

## Structure

- `app/` : nouvelle application Open SaaS et modèle Prisma YoyOrder.
- `blog/` : site de documentation Open SaaS.
- `e2e-tests/` : exemples de tests fournis par Open SaaS.
- `docs/migration-open-saas.md` : correspondance des données et étapes de migration.

## Démarrage

Wasp doit être installé dans WSL sous Windows. Depuis un terminal WSL, ouvrir le dossier `app/`, installer les dépendances JavaScript, démarrer PostgreSQL, puis lancer les migrations Prisma et l'application selon le [guide Open SaaS](https://docs.opensaas.sh/start/getting-started/).

Le fichier `.env.server` doit être créé à partir de `app/.env.server.example`. Pour le développement local, Wasp peut gérer PostgreSQL avec `wasp start db`. L'envoi d'e-mails est à configurer avant toute mise en production.

## Déploiement Docker

Le fichier `docker-compose.yml` et la commande `maj-yoyorder` préparent le déploiement Linux de la nouvelle application Wasp. Installation, variables de production, sauvegardes et prérequis applicatifs : [guide de production](docs/deploiement-production.md).

## État de la migration

Le template Open SaaS et le modèle PostgreSQL sont installés. L'authentification remplace la connexion JWT. Les nouveaux parcours Wasp couvrent les demandes par secteur, l'enregistrement des commandes, les réceptions partielles avec lots et certificats, le suivi des quantités, la création des principaux référentiels et l'attribution des rôles/secteurs par l'administrateur.

Cette branche contient uniquement le nouveau socle Open SaaS. L'ancienne application est conservée dans l'historique Git de la branche `dev`.

La parité n'est pas encore complète : l'édition des référentiels, les sous-articles, les historiques et l'import réel des données restent à terminer avant le basculement en production. La base MySQL de production reste inchangée. Voir le [guide de migration](docs/migration-open-saas.md).
