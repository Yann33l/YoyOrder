" Ce fichier permet de se connecter à la base de données et de créer une session pour les requêtes "
import os
import socket

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Détection de l'environnement
local_ip = socket.gethostbyname(socket.gethostname())
print(local_ip)

if local_ip == '192.168.1.67':
    ENV = "local"
else:
    # Environnement en ligne
    ENV = os.environ.get("ENV", "online")

# Récupération des variables d'environnement pour scalingo
Login = os.getenv("Login")
Password = os.getenv("Password")
Server_Host = os.getenv("Server_Host")
Port = os.getenv("Port")
Database = os.getenv("Database")


# scalingo
SCALINGO_MYSQL_URL = f"mysql://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

# Local
SQLALCHEMY_DATABASE_URL = "mysql+mysqlconnector://root:Study_projet3@localhost:3310/yoyorder"


if ENV == "local":
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

else:
    engine = create_engine(SCALINGO_MYSQL_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()
