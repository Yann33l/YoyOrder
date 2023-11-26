" Main file of the API."
import os
import socket
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import CRUD, client_repository, models, schemas
from .database import ENV, SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

local_ip = socket.gethostbyname(socket.gethostname())

if ENV == "local":
    SECRET_KEY = "B4AB1DBD6953186D3ABF5C8D5625CF06"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 5
else:
    SECRET_KEY = str(os.getenv("SECRET_KEY"))
    ALGORITHM = str(os.getenv("ALGORITHM"))
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or 60)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()


if ENV == "local":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://study-bloc3.vercel.app"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------------------------------------ #
# region Connexion par token


def create_access_token(data: dict, expires_delta: timedelta or None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401, detail="Invalid authentication credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub", None)
        if email is None:
            raise credentials_exception
        user = CRUD.get_user_by_email(db, email=email)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except JWTError:
        raise credentials_exception


async def get_current_active_user(current_user: schemas.UserBase = Depends(get_current_user)):
    return current_user


@app.post("/token/", response_model=schemas.Token)
async def login_for_access_token_docs(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = CRUD.get_user_by_email(db, form_data.username)
    if user is None:
        raise HTTPException(status_code=404, detail="Email incorrect")
    else:
        if bcrypt.checkpw(form_data.password.encode('utf-8'), bytes(user.Password)):
            access_token_expires = timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.Email}, expires_delta=access_token_expires)
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            raise HTTPException(
                status_code=404, detail="Mot de passe incorrect")


@app.post("/Connexion/", response_model=schemas.Token)
async def login_for_access_token(current_user: schemas.UserForm, db: Session = Depends(get_db)):
    user = CRUD.get_user_by_email(db, current_user.Email)
    if user is None:
        raise HTTPException(status_code=404, detail="Email incorrect")
    else:
        if bcrypt.checkpw(current_user.Password.encode('utf-8'), bytes(user.Password)):
            access_token_expires = timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.Email}, expires_delta=access_token_expires)
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            raise HTTPException(
                status_code=404, detail="Mot de passe incorrect")


@app.post("/user/info/", response_model=schemas.UserBase)
async def read_user_info(current_user: schemas.UserBase = Depends(get_current_active_user)):
    return schemas.UserBase(
        Email=current_user.Email,
        Admin=current_user.Admin,
        Autorisation=current_user.Autorisation,
    )

# endregion : Connexion par token

# region : Connexion visualisation et création d'un utilisateur
# Creation d'un utilisateur


@app.post("/create_user/", response_model=schemas.UserCreate)
def create_users(user: schemas.UserCreate, db: Session = Depends(get_db)):
    user_exists = CRUD.get_user_by_email(db, user.Email)
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    else:
        salt = bcrypt.gensalt(12)
        user.Password = bcrypt.hashpw(user.Password, salt)
        return CRUD.create_user(db, user)

# Récupération de la liste des utilisateurs


@app.get("/users/", response_model=list[schemas.UserBase])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Admin is True:
        users = CRUD.get_users(db, skip=skip, limit=limit)
        return users

# Récupération d'un utilisateur par son email


@app.get("/userByEmail/", response_model=schemas.UserBase)
def read_user_email(email: str, db: Session = Depends(get_db)):
    db_user = CRUD.get_user_by_email(db, email)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Mise à jour du statu Admin d'un utilisateur


@app.put("/editUserAdmin/", response_model=schemas.UserBase)
def update_user_Admin(user_edit: schemas.UserEditAdmin, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Admin is True:
        user = CRUD.edit_admin_status(
            db, user_edit.Email, user_edit.Admin)
        return user

# Mise à jour du statu Autorisation d'un utilisateur


@app.put("/editUserAutorisation/", response_model=schemas.UserBase)
def update_user_Autorisation(edit_user: schemas.UserEditAutorisation, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Admin is True:
        user = CRUD.edit_autorisation_status(
            db, edit_user.Email, edit_user.Autorisation)
        return user
# endregion : Connexion visualisation et création d'un utilisateur