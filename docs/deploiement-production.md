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

Installer Git, Node.js compatible avec Wasp/Vite (Node 22.12+), npm, Wasp **0.25.x**, Docker Engine avec Compose v2 (`--wait`), `flock` (util-linux) et [age](https://github.com/FiloSottile/age). Le compte de déploiement doit accéder à Docker et pouvoir écrire dans le dépôt.

Exemple avec la branche `feat/open-saas-clean` clonée dans `/home/ubuntu/yoyOrder` :

```bash
cd /home/ubuntu/yoyOrder
cp .env.production.example .env.production
cp .env.production.server.example .env.production.server
chmod 600 .env.production .env.production.server
openssl rand -hex 32 # mot de passe PostgreSQL
openssl rand -hex 32 # secret JWT indépendant
# Modifier les deux fichiers avec les secrets et les deux domaines publics.
alias maj-yoyorder='bash /home/ubuntu/yoyOrder/scripts/update-yoyorder-vps.sh'
# Ajouter la même ligne une seule fois dans ~/.bash_aliases pour la conserver.
# Configurer la clé de sauvegarde comme indiqué ci-dessous avant le lancement.
maj-yoyorder --no-pull
```

Utiliser un mot de passe PostgreSQL hexadécimal : il est intégré à une URL de connexion sans encodage supplémentaire. Garder le même mot de passe après création du volume ; changer la variable seule ne change pas le mot de passe PostgreSQL.

Les ports sont publiés sur **127.0.0.1** pour le reverse proxy installé sur l'hôte. Ajouter les deux domaines au proxy existant et pointer leurs DNS vers le serveur. `deploy/Caddyfile.example` donne les deux routes HTTPS ; intégrer ces blocs à la configuration existante et adapter les ports si nécessaire. Si le proxy est lui-même dans Docker, son `127.0.0.1` ne correspond pas à l'hôte : il faudra adapter les réseaux avant utilisation.

Ne pas remplacer la configuration globale du proxy ou ouvrir un second proxy sur les ports 80/443 déjà utilisés par YoyImmo.

## Mise à jour

```bash
maj-yoyorder
```

Comme pour YoyImmo, l'alias appelle `scripts/update-yoyorder-vps.sh`. Le fichier `maj-yoyorder` à la racine reste un raccourci utilisable directement. Le script résout son dossier, verrouille l'exécution et journalise les anciennes/nouvelles révisions. Il refuse un dépôt modifié, récupère explicitement `origin/feat/open-saas-clean`, puis s'arrête si la révision est déjà à jour ou si le code local a divergé.

Pour une installation existante, le serveur et PostgreSQL doivent être sains. Le script sauvegarde la base **avant la fusion du code** : `pg_dump` est transmis directement à `age`, sans archive en clair sur disque. Il déchiffre ensuite intégralement le fichier en flux pour vérifier son authenticité et contrôle sa structure avec `pg_restore --list` (ce contrôle ne remplace pas un essai de restauration). Il avance ensuite Git avec `merge --ff-only`, valide Compose sans afficher ses secrets, compile Wasp et Vite, construit les images et démarre tous les services Compose avec attente des contrôles de santé. Une erreur interrompt la commande. Au premier lancement, `--no-pull` construit l'application, démarre PostgreSQL et sauvegarde la base initiale avant les migrations.

`maj-yoyorder --no-pull` déploie le contenu déjà présent, notamment lors de l'installation initiale ou après un changement local volontaire. Il permet aussi de redéployer la même révision après changement des variables. `maj-yoyorder --backup-only` sauvegarde uniquement la base, sans Git ni compilation. Les archives **chiffrées** (`.dump.age`) sont conservées hors du dépôt, dans `/home/ubuntu/yoyOrder_backups`, sans purge automatique ; prévoir une copie hors du serveur et des sauvegardes régulières. Un fichier `.partial` est une tentative inachevée, pas une sauvegarde acceptée.

## Clé de chiffrement des sauvegardes

Sur Ubuntu 22.04+ ou Debian 12+, installer `age`, puis créer une clé dédiée **une seule fois**, sous le compte `ubuntu` :

```bash
sudo apt update
sudo apt install -y age
install -d -m 700 "$HOME/.config/yoyorder"
(umask 077; test -e "$HOME/.config/yoyorder/backup.agekey" || age-keygen -o "$HOME/.config/yoyorder/backup.agekey")
chmod 600 "$HOME/.config/yoyorder/backup.agekey"
```

Le script dérive la clé publique avec `age-keygen -y` pour le chiffrement, et utilise la clé privée pour le contrôle du déchiffrement. La clé privée n'est jamais imprimée ni placée dans Docker, Git ou les sauvegardes. Elle doit appartenir au compte de déploiement, avoir les droits `600` ou `400`, et se trouver hors du dépôt et du dossier de sauvegardes. `BACKUP_IDENTITY_FILE` permet de changer son chemin absolu. Une clé native age unique, sans passphrase, permet l'exécution automatique.

Conserver une copie de cette clé dans un coffre sécurisé distinct des archives, hors du VPS. Sans cette clé, les sauvegardes sont irrécupérables. La présence de la clé sur le VPS permet la vérification automatique ; le chiffrement protège les archives copiées séparément, mais ne protège pas contre la compromission complète du VPS et de sa clé. En cas de rotation, conserver les anciennes clés pour lire les anciennes archives. Les éventuels anciens fichiers `.dump` en clair ne sont pas convertis automatiquement.

Pour contrôler une archive sans écrire son contenu en clair :

```bash
cd /home/ubuntu/yoyOrder
set -o pipefail
age --decrypt --identity "$HOME/.config/yoyorder/backup.agekey" \
  /home/ubuntu/yoyOrder_backups/yoyorder-REMPLACER.dump.age \
  | docker compose --env-file .env.production exec -T postgres \
      sh -c 'set -e; pg_restore --list; cat >/dev/null'
```

Pour un essai de restauration, envoyer ce même flux déchiffré à `pg_restore` sur une **base de test séparée**. La procédure de retour arrière ci-dessous reste nécessaire avant toute restauration en production.

Le journal est `/home/ubuntu/yoyOrder_backups/yoyorder_deploy.log`. Les variables `PROJECT_DIR`, `BACKUP_PARENT_DIR`, `LOG_FILE`, `BRANCH`, `COMPOSE_FILE` et `HEALTH_TIMEOUT_SECONDS` permettent de surcharger ces valeurs. Le dossier du dépôt est déduit du script ; si `PROJECT_DIR` est surchargé, utiliser un chemin absolu. La branche par défaut est `feat/open-saas-clean`, pas `main` qui contient l'ancienne application.

Le proxy partagé de YoyImmo n'est pas démarré ni reconfiguré par ce script. Pour vérifier qu'il tourne en fin de déploiement, définir `PROXY_CONTAINER=yoyimmo-caddy`. Le script ne purge pas les images ou caches globaux de Docker sur ce VPS partagé.

L'URL de l'API est incorporée au client à la compilation : modifier `WASP_SERVER_URL` nécessite une nouvelle mise à jour. Les variables serveur sont lues depuis `.env.production.server`, les variables Compose depuis `.env.production`.

## Diagnostic et retour arrière

```bash
cd /home/ubuntu/yoyOrder
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 server web postgres
curl --fail http://127.0.0.1:3100/healthz
curl --fail http://127.0.0.1:3101/health
```

Un échec de compilation laisse les conteneurs actuels en place. Après lancement du nouveau serveur, une migration peut déjà avoir modifié la base : le script ne fait pas de restauration automatique. Le dump pris pendant que l'ancienne application fonctionne peut précéder de nouvelles écritures ; prévoir une fenêtre de maintenance pour les migrations incompatibles et pour une restauration.

Pour revenir en arrière, identifier le commit précédent, analyser la compatibilité du schéma avec celui-ci et utiliser `maj-yoyorder --no-pull` sur ce commit. Si une restauration est nécessaire, arrêter les écritures et faire d'abord un essai de restauration sur une base séparée avec `pg_restore`. Toute restauration en place remplace des données et doit être planifiée. Ne jamais utiliser `docker compose down -v` sur cette installation : cela supprime le volume de la base.

## Limites de validation locale

La configuration doit encore être validée avec une compilation Wasp complète et un lancement Docker sur Linux. Le script reprend le fonctionnement du script YoyImmo fourni ; les domaines et l'accès au Caddy du VPS restent à configurer.

Les scénarios Git à jour, dépôt modifié, divergence, service non sain, clé absente, échec de sauvegarde/chiffrement/déchiffrement/validation, succès et échec de démarrage sont vérifiables sans Docker réel avec `bash tests/deployment.test.sh`. Les outils sont simulés ; les contrôles de permissions POSIX du test s'exécutent uniquement sous Linux. Avec `age` installé, `TEST_REAL_AGE=1 bash tests/deployment.test.sh` vérifie aussi le chiffrement et le déchiffrement réels sur des données factices.
