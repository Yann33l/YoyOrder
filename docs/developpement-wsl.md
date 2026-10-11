# Raccourcis de développement Windows / WSL

Deux raccourcis sont créés par `scripts/install-desktop-shortcuts.ps1`, comme pour YoyImmo :

- **YoyOrder - Mettre a jour dev WSL** : synchronise le code de ce dépôt vers Ubuntu, prépare la compilation Wasp, applique les migrations locales et reconstruit les images serveur/client.
- **YoyOrder - Demarrer dev WSL** : démarre les images déjà construites, sans synchronisation ni compilation. Utiliser « Mettre à jour » lors du premier lancement et après modification du code.

L'application s'ouvre sur **http://localhost:8083** et l'API utilise le port **3083**. Le projet Docker est `yoyorder-wsl-test`, avec sa propre base `yoyorder_wsl_test`. YoyImmo et la production ne sont pas modifiés.

## Accès depuis Tailscale

Le client WSL utilise `/api` sur l’adresse de la page. Nginx relaie ces appels vers le serveur, ce qui permet d’utiliser le même client sur localhost et depuis un autre appareil. L’API sur le port 3083 et Mailpit restent accessibles uniquement localement.

Sur le PC Windows hébergeant WSL, activer le relais privé persistant :

```powershell
& 'C:\Program Files\Tailscale\tailscale.exe' serve --bg --tcp=8083 tcp://127.0.0.1:8083
```

YoyOrder est alors accessible à **http://100.114.13.122:8083** depuis les appareils autorisés du même réseau Tailscale, lorsque l’environnement WSL est démarré. Le relais reste configuré après les mises à jour et redémarrages de Tailscale. Les règles d’accès du réseau Tailscale s’appliquent au port 8083.

Contrôler ou désactiver uniquement ce relais :

```powershell
& 'C:\Program Files\Tailscale\tailscale.exe' serve status
& 'C:\Program Files\Tailscale\tailscale.exe' serve --tcp=8083 off
```

Après cette modification du client, utiliser le raccourci « Mettre à jour » et recharger le navigateur avec Ctrl + F5. La configuration Nginx et l’adaptation du SDK concernent seulement la compilation WSL ; la production conserve sa configuration.

Les e-mails de test (vérification de compte et réinitialisation du mot de passe) arrivent dans Mailpit sur **http://localhost:8027**. Le fournisseur SMTP est configuré uniquement dans la copie Linux compilée pour cet environnement.

Le code de développement est copié dans `/home/yoylinux/yoyorder-wsl-test` sur le système de fichiers Linux, conformément aux recommandations Wasp pour WSL. Les dépendances, artefacts de compilation et migrations locales restent dans cette copie. Les modifications effectuées dans cette copie Linux ne sont pas recopiées vers le dépôt Windows.

La compilation utilise un conteneur Node 24 / Wasp 0.25 : aucun besoin d'installer ces outils sur l'hôte Ubuntu. Docker, systemd, rsync et openssl doivent être disponibles dans la distribution `Ubuntu`. Le premier lancement télécharge les images et dépendances et peut prendre plusieurs minutes.

Les secrets PostgreSQL/JWT locaux sont générés dans `.env.wsl`. Les valeurs factices du template sont copiées dans `app/.env.server` uniquement sur Linux. Les fichiers de secrets Windows et de production sont exclus de la synchronisation. Les intégrations externes du template nécessitent leurs propres clés de test pour être utilisées.

Pour réinstaller les raccourcis après déplacement du dépôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-desktop-shortcuts.ps1
```

Le lanceur garde la fenêtre ouverte pour consulter les erreurs, ouvre le navigateur après vérification HTTP et maintient Ubuntu actif en arrière-plan. Pour l'utiliser sans fenêtre interactive ni navigateur :

```powershell
.\scripts\update-wsl-dev.ps1 -NoPause -NoBrowser
.\scripts\update-wsl-dev.ps1 -SkipBuild -NoPause -NoBrowser
```

`-SyncOnly` copie uniquement les sources. Les mises à jour sont verrouillées pour éviter deux compilations simultanées. En cas de conflit de migrations, corriger le problème manuellement sur la base de test : le lanceur ne force aucune remise à zéro.
