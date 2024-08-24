# Présentation de l'application Yoyorder

=======

**Yoyorder** est une application conçue pour optimiser la gestion des commandes et des stocks dans un laboratoire comportant plusieurs unités. Cette plateforme centralisée permet de suivre et de réaliser l'ensemble des processus liés à l'acquisition, au stockage, et à la consommation des articles. Grâce à des rôles distincts, Yoyorder assure une gestion efficace et fluide des ressources du laboratoire.

## Les rôles et fonctionnalités

### 1. Demandeurs

Les **Demandeurs** sont chargés de formuler les besoins en articles au sein du laboratoire. Ils ont accès aux fonctionnalités suivantes :

- **Saisie de nouvelles demandes d'articles** : Les Demandeurs peuvent ajouter des articles à la liste des besoins en précisant la quantité et la date de livraison souhaitée.
- **Réception des articles** : Ils enregistrent la date de réception, les quantités reçues, et les lots associés une fois les articles livrés.

### 2. Acheteurs

Les **Acheteurs** gèrent les commandes des articles auprès des fournisseurs. Leurs responsabilités incluent :

- **Saisie de la date de commande** : Ils enregistrent la date à laquelle chaque commande est passée pour assurer la traçabilité.
- **Saisie du numéro de commande** : Un numéro de commande unique est attribué à chaque transaction.
- **Exportation des listes d'articles à commander** : Ils peuvent exporter des listes d'articles à commander, avec des filtres basés sur les fournisseurs, facilitant ainsi la gestion des commandes.

### 3. Éditeurs

Les **Éditeurs** ont un rôle crucial dans la structuration et la mise à jour des informations de base de l'application. Ils peuvent :

- **Créer** :
  - Des pièces (les différents locaux ou zones de stockage)
  - Des secteurs (les différentes unités ou divisions du laboratoire)
  - Des fournisseurs (les partenaires commerciaux)
  - Des articles (les produits ou matériaux nécessaires)
  - Des sous-articles (les variantes spécifiques des articles principaux)
- **Éditer** :
  - Les pièces
  - Les secteurs
  - Les fournisseurs
  - Les articles
  - Les sous-articles

Ces capacités permettent une adaptation continue de l'application aux besoins évolutifs du laboratoire.

### 4. Administrateurs

Les **Administrateurs** ont un accès complet à l'ensemble du système via le panneau d'administration, leur permettant de superviser la configuration de l'application, la gestion des utilisateurs, et les permissions.

## Fonctions additionnelles

En plus des fonctionnalités principales, Yoyorder propose des outils avancés pour un contrôle accru des processus :

- **Suivi des quantités consommées** : Yoyorder permet de suivre précisément les quantités d'articles consommés, garantissant ainsi une gestion efficace des stocks.
- **Suivi des lots consommés** : Grâce à cette fonctionnalité, les utilisateurs peuvent suivre l'ouverture et la fin d'utilisation des lots reçus. Cela inclut l'enregistrement des dates d'ouverture et de fin d'utilisation, assurant une traçabilité complète et une gestion optimisée des ressources.
- **Gestion des certificats d'analyses** : L'application permet également de gérer les certificats d'analyses pour garantir que les produits reçus respectent les normes de qualité requises.

**Yoyorder** se positionne ainsi comme une solution complète et intégrée pour la gestion des commandes et des stocks au sein des laboratoires, offrant des outils dédiés à chaque rôle et des fonctionnalités avancées pour un suivi rigoureux et une traçabilité optimale.


---

# Variables d'environement à creer :

## exemple

### Back

**Login** = "root"

**Password** = "projet3"

**Server_Host** = "localhost"

**Port** = 3388

**Database** = "yoyo"

**Env** = "local" => SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

autre => SCALINGO_MYSQL_URL = f"mysql://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

**local_allow_origins** = ["*"]

**allow_origins** = ["https://yoyo.vercel.app"]

**SECRET_KEY** = "F6K6L6M2C1D9E2B4A6F8C6D5B6A0E6C6"

**ALGORITHM** = "HS256"

**ACCESS_TOKEN_EXPIRE_MINUTES** = 180

### Front

**VITE_API_LOCAL_URL** = "http://127.0.0.1:8000"

**VITE_API_ONLINE_URL** = "https://yoyo.scalo.io"

**VITE_EMAIL_FINI_PAR** = "@ab"