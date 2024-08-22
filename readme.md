Variables d'environement à creer :
exemple

---

Back

Login = "root"
Password = "projet3"
Server_Host = "localhost"
Port = 3388
Database = "yoyo"
Env = "local" => SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{Login}:{Password}@{Server_Host}:{Port}/{Database}"
/ autre => SCALINGO_MYSQL_URL = f"mysql://{Login}:{Password}@{Server_Host}:{Port}/{Database}"

SECRET_KEY = "F5E7F2E2C1D9E2B4A6F8C7D5B2A0E3C1"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 180

---

Front

VITE_API_LOCAL_URL = "http://127.0.0.1:8000"
VITE_API_ONLINE_URL = "https://yoyo.scalingo.io"
