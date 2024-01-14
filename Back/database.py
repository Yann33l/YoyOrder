" Ce fichier permet de se connecter à la base de données et de créer une session pour les requêtes "
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Récupération des variables d'environnement pour scalingo
Login = os.getenv("Login")
Password = os.getenv("Password")
Server_Host = os.getenv("Server_Host")
Port = os.getenv("Port")
Database = os.getenv("Database")
Env = os.getenv("Env")


# scalingo
SCALINGO_MYSQL_URL = f"mysql://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

# Local
SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

if Env == "dev":
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

else:
    engine = create_engine(SCALINGO_MYSQL_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()
