# Production Docker YoyOrder

Cette configuration déploie **la nouvelle application Wasp dans `app/`**. Cette branche ne contient plus l'ancienne application et n'importe pas sa base MySQL. Le projet Compose `yoyorder`, son volume PostgreSQL et les ports 3100/3101 sont propres à cette application. Vérifier que ces ports sont libres sur le serveur qui héberge YoyImmo.

## Prérequis applicatifs

La configuration suit le [déploiement manuel Wasp 0.25](https://wasp.sh/docs/deployment/deployment-methods/cloud-providers) : `wasp build` produit le Dockerfile serveur dans `.wasp/out`, puis Vite construit le client avec son URL d'API publique. Le serveur Wasp applique les migrations avant de démarrer, selon la [documentation des migrations](https://wasp.sh/docs/deployment/database).

Avant le premier déploiement :

- Générer les migrations en développement avec `wasp db migrate-dev`, les relire et versionner `app/migrations/`. Le script refuse de déployer sans migration SQL.
- Remplacer le fournisseur `Dummy` dans `app/src/server/emailSender.wasp.ts` et les adresses `me@example.com` dans ce fichier et `app/src/auth/auth.wasp.ts` par un fournisseur réel et une adresse autorisée. Tester inscription, vérification et réinitialisation du mot de passe.
- Renseigner les intégrations encore présentes dans `app/src/env.ts` ou retirer les fonctions et validations inutilisées du template (paiement, IA, stockage S3). Le modèle fourni liste les variables actuellement exigées. Des clés vides ne rendent pas ces fonctions opérationnelles.
- Valider les parcours métier et la migration MySQL avant le basculement des utilisateurs (voir `migration-open-saas.md`).

## Installation sur le serveur Linux

Installer Git, Node.js compatible avec Wasp/Vite (Node 22.12+), npm, Wasp **0.25.x**, Docker Engine avec Compose v2 (`--wait`), et `flock` (util-linux). Le compte de déploiement doit accéder à Docker et pouvoir écrire dans le dépôt.

Exemple avec le dépôt cloné dans `/opt/yoyorder` :

```bash
cd /opt/yoyorder
cp .env.production.example .env.production
cp .env.production.server.example .env.production.server
chmod 600 .env.production .env.production.server
openssl rand -hex 32 # mot de passe PostgreSQL
openssl rand -hex 32 # secret JWT indépendant
# Modifier les deux fichiers avec les secrets et les deux domaines publics.
chmod +x maj-yoyorder
sudo ln -s /opt/yoyorder/maj-yoyorder /usr/local/bin/maj-yoyorder
maj-yoyorder --no-pull
```

Utiliser un mot de passe PostgreSQL hexadécimal : il est intégré à une URL de connexion sans encodage supplémentaire. Garder le même mot de passe après création du volume ; changer la variable seule ne change pas le mot de passe PostgreSQL.

Les ports sont publiés sur **127.0.0.1** pour le reverse proxy installé sur l'hôte. Ajouter les deux domaines au proxy existant et pointer leurs DNS vers le serveur. `deploy/Caddyfile.example` donne les deux routes HTTPS ; intégrer ces blocs à la configuration existante et adapter les ports si nécessaire. Si le proxy est lui-même dans Docker, son `127.0.0.1` ne correspond pas à l'hôte : il faudra adapter les réseaux avant utilisation.

Ne pas remplacer la configuration globale du proxy ou ouvrir un second proxy sur les ports 80/443 déjà utilisés par YoyImmo.

## Mise à jour

```bash
maj-yoyorder
```

Le script résout son chemin réel, verrouille l'exécution, refuse un dépôt modifié, puis fait `git pull --ff-only` sur la branche suivie. Il valide Compose sans afficher ses secrets, compile Wasp et Vite, construit les deux images, attend PostgreSQL, sauvegarde la base et contrôle l'archive avec `pg_restore --list`. Il démarre enfin le serveur et le client et attend leurs contrôles de santé. Une erreur interrompt la commande.

`maj-yoyorder --no-pull` déploie le contenu déjà présent, notamment lors de l'installation initiale ou après un changement local volontaire. `maj-yoyorder --backup-only` sauvegarde uniquement la base, sans Git ni compilation. Les archives sont privées et conservées dans `backups/` sans purge automatique ; prévoir une copie hors du serveur et des sauvegardes régulières.

L'URL de l'API est incorporée au client à la compilation : modifier `WASP_SERVER_URL` nécessite une nouvelle mise à jour. Les variables serveur sont lues depuis `.env.production.server`, les variables Compose depuis `.env.production`.

## Diagnostic et retour arrière

```bash
cd /opt/yoyorder
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 server web postgres
curl --fail http://127.0.0.1:3100/healthz
curl --fail http://127.0.0.1:3101/health
```

Un échec de compilation laisse les conteneurs actuels en place. Après lancement du nouveau serveur, une migration peut déjà avoir modifié la base : le script ne fait pas de restauration automatique. Le dump pris pendant que l'ancienne application fonctionne peut précéder de nouvelles écritures ; prévoir une fenêtre de maintenance pour les migrations incompatibles et pour une restauration.

Pour revenir en arrière, identifier le commit précédent, analyser la compatibilité du schéma avec celui-ci et utiliser `maj-yoyorder --no-pull` sur ce commit. Si une restauration est nécessaire, arrêter les écritures et faire d'abord un essai de restauration sur une base séparée avec `pg_restore`. Toute restauration en place remplace des données et doit être planifiée. Ne jamais utiliser `docker compose down -v` sur cette installation : cela supprime le volume de la base.

## Limites de validation locale

La configuration doit encore être validée avec une compilation Wasp complète et un lancement Docker sur Linux. L'alignement exact avec `maj-yoyimmo` dépend de l'accès à son script et à la configuration du serveur.
