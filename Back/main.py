" Main file of the API."
import os
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import CRUD, client_repository, models, schemas
from .database import ENV, SessionLocal, engine
from datetime import date

models.Base.metadata.create_all(bind=engine)


if ENV == "local":
    SECRET_KEY = "B4AB1DBD6953186D3ABF5C8D5625CF06"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 180
else:
    SECRET_KEY = str(os.getenv("SECRET_KEY"))
    ALGORITHM = str(os.getenv("ALGORITHM"))
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or 60)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()
router = APIRouter()


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

# ------------------- Connexion ------------------------ #
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

# region : visualisation, création et modification d'un utilisateur
    # Creation d'un utilisateur
@app.post("/create_user/", response_model=schemas.UserCreate)
def create_users(user: schemas.UserCreate, db: Session = Depends(get_db)):
    user_exists = CRUD.get_user_by_email(db, user.Email)
    if user_exists:
        raise HTTPException(status_code=409, detail="Email déjà enregistré")
    else:
        salt = bcrypt.gensalt(12)
        user.Password = bcrypt.hashpw(user.Password, salt)
        return CRUD.create_user(db, user)


    # Formatage des résultats de la requête
def format_user_results(results):
    secteur_labels = client_repository.get_secteur_labels()
    formatted_results = []
    for row in results:
        formatted_result = {
            "user_id": row[0],
            "Email": row[1],
            "Admin": row[2],
            "Autorisation": row[3],
            "Demandeur": row[4],
            "Acheteur": row[5],
        }
        formatted_result.update(
            {f"{secteur_labels[i]}": row[i + 6] for i in range(len(secteur_labels))})
        formatted_results.append(formatted_result)
    return formatted_results

    # Récupération de la liste des utilisateurs
@app.get("/users/")
def read_users(current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Admin is True:
        try:
            results = client_repository.get_users()
            formatted_results = format_user_results(results)
            return {"results": formatted_results}

        except Exception as e:
            return {"error": str(e)}
    else:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Récupération d'un utilisateur par son email
@app.get("/userByEmail/", response_model=schemas.UserBase)
def read_user_email(email: str, db: Session = Depends(get_db)):
    db_user = CRUD.get_user_by_email(db, email)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

    # Mise à jour du status d'un utilisateur
@router.put("/editUserStatus/{status}/", response_model=schemas.UserBase)
def update_user_status(status: str, edit_user: schemas.UserEditStatus, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Admin is True:
        update_function = None
        update_function = CRUD.edit_user_status(db, edit_user.Email, **{status.lower(): edit_user.Status})
        if update_function:
            return update_function
        else:
            raise HTTPException(status_code=404, detail="User not found")

    # Mise à jour du secteur d'un utilisateur
@app.put("/editUserSecteur/")
def create_r_user_secteur(user_secteur_edited: schemas.r_user_secteur, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Admin is True:
        try:
            secteur_id = client_repository.get_secteurID_by_libelle(
                user_secteur_edited.secteur_libelle)
            CRUD.edit_user_secteur(
                db, user_secteur_edited.user_id, secteur_id)
            results = client_repository.get_users()
            formatted_results = format_user_results(results)
            return {"results": formatted_results}
        except Exception as e:
            print(f"Authentication error: {e}")
# endregion : visualisation, création et modification d'un utilisateur

# region : Visualisation création et modification d'une commande

    # Formatage des résultats de la requête
def format_Commande_results(results):
    secteur_labels = client_repository.get_secteur_labels()
    formatted_results = []
    for row in results:
        formatted_result = {
            "commande_id": row[0],
            "article_id": row[1],
            "nom article": row[2],
            "ref": row[3],
            "fournisseur": row[4],
            "conditionnement": row[5],
            "quantité": row[6] if row[6] is not None else 0,
            "date Demande": row[7] if row[7] is not None else None,
            "date Commande": row[8] if row[8] is not None else None,
        }
        formatted_result.update(
            {f"{secteur_labels[i]}": row[i + 9] if row[i + 9] is not None else 0 for i in range(len(secteur_labels))})
        formatted_results.append(formatted_result)
        print(formatted_result)
    return formatted_results 


@app.get("/articlesCommande/")
def read_articles_by_secteur(current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Acheteur is True:
        try:
            results = client_repository.get_articles_to_buy()
            formatted_results = format_Commande_results(results) 
            return {"results": formatted_results}
             
        except Exception as e:
            return {"error": str(e)}
    else:
        raise HTTPException(status_code=400, detail="Pas un acheteur")
    
    # Edition d'une commande
@app.put("/editCommande/")
def update_commande(edit_commande: schemas.edit_commande, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Acheteur is True:
        try:
            CRUD.edit_commande_dateCommande(db, edit_commande)
            results = client_repository.get_articles_to_buy()
            formatted_results = format_Commande_results(results)
            return {"results": formatted_results}

        except Exception as e:
            print(f"Authentication error: {e}")
# endregion : Visualisation création et modification d'une commande

# region : Visualisation modification et création d'une demande
    # Récupération de la liste des articles par piece
@router.get("/articlesDemande/{piece}")
def read_articles_by_secteur(piece: str, current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Demandeur is True:
        try:
            results = client_repository.get_articles_by_secteur(piece_libelle=piece)
            formatted_results = format_Commande_results(results)
            return {"results": formatted_results}
             
        except Exception as e:
            return {"error": str(e)}
    else:
        raise HTTPException(status_code=400, detail="l'utilisateur n'est pas un demandeur")
    
@app.get("/articlesDemande/")
def read_articles_by_secteur(current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Demandeur is True:
        try:
            results = client_repository.get_articles_by_secteur(piece_libelle="%")
            formatted_results = format_Commande_results(results)
            return {"results": formatted_results}
             
        except Exception as e:
            return {"error": str(e)}
    else:
        raise HTTPException(status_code=400, detail="l'utilisateur n'est pas un demandeur")
        
def format_Reception_results(results):
    secteur_labels = client_repository.get_secteur_labels()
    formatted_results = []
    for row in results:
        formatted_result = {
            "commande_id": row[0],
            "article_id": row[1],
            "nom article": row[2],
            "ref": row[3],
            "fournisseur": row[4],
            "conditionnement": row[5],
            "quantité": row[6] if row[6] is not None else 0,
            "date Demande": row[7] if row[7] is not None else None,
            "date Commande": row[8] if row[8] is not None else None,
            "date Reception": row[9] if row[9] is not None else None,
        }
        formatted_result.update(
            {f"{secteur_labels[i]}": row[i + 10] if row[i + 10] is not None else 0 for i in range(len(secteur_labels))})
        formatted_results.append(formatted_result)
        print(formatted_result)
    return formatted_results 

@app.get("/articlesReception/")
def read_articles_by_secteur(current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Demandeur is True:
        try:
            results = client_repository.get_articles_to_receve(piece_libelle="%")
            formatted_results = format_Reception_results(results)
            return {"results": formatted_results}
             
        except Exception as e:
            return {"error": str(e)}
    else:
        raise HTTPException(status_code=400, detail="l'utilisateur n'est pas un demandeur")
    # Edition d'une demande
@router.put("/editDemande/{edited_row}")
def uptdate_demande(edited_row, edit_demande: schemas.edit_demande,  db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Demandeur is True:  
        if isinstance(edit_demande.editedValue, int):
            print(f"quantité : {edit_demande}")
            CRUD.edit_commande_quantite(db, edit_demande, edited_row)
        else:
            print(f"date : {edit_demande}")
            CRUD.edit_commande_dateDemande(db, edit_demande)
        try:
            value= edit_demande
            return {"results": value}
        except Exception as e:
            print(f"Authentication error: {e}")

    
@app.get("/articles/", response_model=list[schemas.Articles])
def read_articles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        articles = CRUD.get_articles(db, skip=skip, limit=limit)
        return articles


@app.post("/create_article/", response_model=schemas.ArticlesCreate)
def create_article(article: schemas.ArticlesCreate, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        article_exist = CRUD.get_articles_by_libelle(db,  article.libelle)
        if article_exist is not None:
            raise HTTPException(
                status_code=409, detail="l'article existe deja")
        else:
            return CRUD.create_article(db, article)

# endregion : Visualisation et création d'un article


@app.get("/fournisseurs/", response_model=list[schemas.Fournisseurs])
def read_fournisseurs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        fournisseurs = CRUD.get_fournisseurs(db, skip=skip, limit=limit)
        return fournisseurs


@app.post("/create_fournisseur/", response_model=schemas.Fournisseurs)
def create_fournisseur(fournisseur: schemas.Fournisseurs, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        return CRUD.create_fournisseur(db, fournisseur)


@app.get("/commandes/", response_model=list[schemas.Commandes])
def read_commandes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        commandes = CRUD.get_commandes(db, skip=skip, limit=limit)
        return commandes


@app.post("/create_commande/", response_model=schemas.Commandes)
def create_commande(commande: schemas.Commandes, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        return CRUD.create_commande(db, commande)


@app.get("/secteurs/", response_model=list[schemas.Secteurs])
def read_secteurs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        secteurs = CRUD.get_secteurs(db, skip=skip, limit=limit)
        return secteurs


@app.post("/create_secteur/", response_model=schemas.Secteurs)
def create_secteur(secteur: schemas.Secteurs, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        return CRUD.create_secteur(db, secteur)


@app.get("/stocks/", response_model=list[schemas.Stocks])
def read_stocks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        stocks = CRUD.get_stocks(db, skip=skip, limit=limit)
        return stocks


@app.post("/create_stock/", response_model=schemas.Stocks)
def create_stock(stock: schemas.Stocks, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        return CRUD.create_stock(db, stock)


@app.get("/gestiondescouts/", response_model=list[schemas.GestionDesCouts])
def read_gestiondescouts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        gestiondescouts = CRUD.get_gestiondescouts(db, skip=skip, limit=limit)
        return gestiondescouts


@app.post("/create_gestiondescout/", response_model=schemas.GestionDesCouts)
def create_gestiondescout(gestiondescout: schemas.GestionDesCouts, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        return CRUD.create_gestiondescout(db, gestiondescout)


@app.get("/lieuxdestockage/", response_model=list[schemas.LieuxDeStockage])
def read_lieuxdestockage(skip: int = 0, limit: int = 100,db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        LieuxDeStockage = CRUD.get_lieuxdestockage(db, skip=skip, limit=limit)
        return LieuxDeStockage


@app.post("/create_lieuxdestockage/", response_model=schemas.LieuxDeStockage)
def create_lieuxdestockage(LieuxDeStockage: schemas.LieuxDeStockage, db: Session = Depends(get_db), current_user: schemas.UserBase = Depends(get_current_active_user)):
    if current_user.Autorisation is True:
        return CRUD.create_lieuxdestockage(db, LieuxDeStockage)


@app.get("/usersdates/", response_model=list[schemas.usersdates])
def read_usersdates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    usersdates = CRUD.get_usersdates(db, skip=skip, limit=limit)
    return usersdates


@app.post("/create_usersdate/", response_model=schemas.usersdates)
def create_userdate(userdate: schemas.usersdates, db: Session = Depends(get_db)):
    return CRUD.create_userdate(db, userdate)

@app.get("/get_pieces/", response_model=list[schemas.Piece])
def read_pieces(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    pieces = CRUD.get_pieces(db, skip=skip, limit=limit)
    return pieces


app.include_router(router)