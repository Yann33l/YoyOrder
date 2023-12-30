from datetime import date
from typing import Optional

from pydantic import BaseModel


# --------------------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    Email: str
    Admin: bool
    Autorisation: bool

# --------------------------------------------------------------------------------


class UserForm(BaseModel):
    Email: str
    Password: str


class UserEditAdmin (BaseModel):
    Email: str
    Admin: bool

class UserEditStatus (BaseModel):
    Email: str
    Status: bool



class UserEditAutorisation (BaseModel):
    Email: str
    Autorisation: bool

class UserEditAcheteur (BaseModel):
    Email: str
    Acheteur: bool

class UserEditDemandeur (BaseModel):
    Email: str
    Demandeur: bool

class UserBase(BaseModel):
    Email: str
    Admin: Optional[bool] = False
    Acheteur: Optional[bool] = False
    Demandeur: Optional[bool] = False
    Autorisation: Optional[bool] = False

    class Config:
        orm_mode = True


class UserCreate(UserBase):
    Password: bytes

# --------------------------------------------------------------------------------


class Articles(BaseModel):
    ID: int
    libelle: str
    ref: str
    fournisseur_id: int
    conditionnement: Optional[str] = None
    dateDebutValidite: date
    dateFinValidite: date

    class Config:
        orm_mode = True


class ArticlesCreate(Articles):
    temperature: int
    lieuxDeStockage: str
    secteur_liste: list


class Fournisseurs(BaseModel):
    ID: int
    libelle: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    siteWeb: Optional[str] = None
    getCertificatAnalyse: Optional[str] = None


class Commandes(BaseModel):
    ID: int
    article_id: int
    quantite: int
    secteur_id: int
    dateCommande: date
    dateAchat: Optional[date] = None
    dateReception: Optional[date] = None


class Secteurs(BaseModel):
    ID: int
    libelle: str


class Stocks(BaseModel):
    ID: int
    article_id: int
    quantiteInitiale: Optional[int] = None
    quantiteRestante: Optional[int] = None
    lot: Optional[str] = None
    datePeremption: Optional[date] = None
    dateReception: Optional[date] = None
    COA: Optional[bytes] = None


class GestionDesCouts(BaseModel):
    ID: int
    article_id: int
    prixUnitaire: Optional[float] = None
    dateDebutValidite: date
    dateFinValidite: date


class LieuxDeStockage(BaseModel):
    ID: int
    libelle: str
    temperature: int


class Piece(BaseModel):
    ID: int
    libelle: str


class r_articles_lieux(BaseModel):
    ID: int
    article_id: int
    lieuxDeStockage_id: int

class r_articles_pieces(BaseModel):
    ID: int
    article_id: int
    piece_id: int


class r_articles_pieces(BaseModel):
    ID: int
    article_id: int
    piece_id: int


class r_articles_secteurs(BaseModel):
    ID: int
    article_id: int
    secteur_id: int


class r_user_stock(BaseModel):
    ID: int
    user_id: int
    stock_id: int
    quantiteUpdate: int
    dateUpdate: date


class r_user_commande(BaseModel):
    ID: int
    user_id: int
    commande_id: int
    dateUpdate: date


class r_user_secteur(BaseModel):
    user_id: int
    secteur_libelle: str


class usersdates(BaseModel):
    ID: int
    user_id: int
    date: date
    statut: str
