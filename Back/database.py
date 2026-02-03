import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Use SCALINGO_MYSQL_URL if available, otherwise use local .env
if "SCALINGO_MYSQL_URL" in os.environ:
    # Scalingo environment
    SQLALCHEMY_DATABASE_URL = os.getenv("SCALINGO_MYSQL_URL")
else:
    # Local environment
    Login = os.getenv("Login")
    Password = os.getenv("Password")
    Server_Host = os.getenv("Server_Host")
    Port = os.getenv("Port")
    Database = os.getenv("Database")
    SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
