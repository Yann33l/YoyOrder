from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel
from typing import Union


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

class UserEditStatus (BaseModel):
    Email: str
    Status: bool


class UserBase(BaseModel):
    Email: str
    Admin: Optional[bool] = False
    Acheteur: Optional[bool] = False
    Demandeur: Optional[bool] = False
    Editeur: Optional[bool] = False
    Autorisation: Optional[bool] = False

    class Config:
        from_attributes = True


class UserCreate(UserBase):
    Password: bytes

# --------------------------------------------------------------------------------


class Articles(BaseModel):
    libelle: str
    ref: str
    fournisseur_id: int
    conditionnement: Optional[str] = None
    dateDebutValidite: Optional[date] = datetime.now().date()
    dateFinValidite: Optional[date] = date(3000,12,31)

    class Config:
        from_attributes = True

class ArticlesCreate(Articles):
    temperature: Optional[int] = None
    lieuxDeStockage: Optional[str] = None
    piece_liste: dict[int, bool] = {}

class ArticlesEdit(BaseModel):
    articleID: int
    libelle: Optional[str] = None
    ref: Optional[str] = None
    fournisseur_id: Optional[int] = None
    conditionnement: Optional[str] = None
    dateDebutValidite: Optional[date] = None
    dateFinValidite: Optional[date] = None
    pieceEdited: Optional[str]  = None
    newPieceValue: Optional[int]  = None

class ArticlesWithID(Articles):
    ID: int

class SousArticlesCreation(BaseModel):
    libelle: str
    ref: str
    conditionnement: Optional[str] = None
    dateDebutValidite: Optional[date] = datetime.now().date()
    dateFinValidite: Optional[date] = date(3000,12,31)
    articles_ids: list[int]
    quantite: int

class r_articles_sousArticles(BaseModel):
    article_id: int
    sousArticle_id: int

class SousArticlesEdit(BaseModel):
    articleID : int
    sousArticleID: int
    libelle: Optional[str] = None
    ref: Optional[str] = None
    conditionnement: Optional[str] = None
    dateDebutValidite: Optional[date] = None
    dateFinValidite: Optional[date] = None
    quantite: Optional[int] = None


class CreationFournisseurs(BaseModel):
    libelle: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    siteWeb: Optional[str] = None
    getCertificatAnalyse: Optional[str] = None
    dateDebutValidite: Optional[date] = datetime.now().date()
    dateFinValidite: Optional[date] = date(3000,12,31)
    class Config:
        from_attributes = True

class Fournisseurs(CreationFournisseurs):
    ID: int


class FournisseursEdit(BaseModel):
    ID: int
    libelle: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    siteWeb: Optional[str] = None
    getCertificatAnalyse: Optional[str] = None
    dateDebutValidite: Optional[date] = None
    dateFinValidite: Optional[date] = None


class Commandes(BaseModel):
    ID: int
    article_id: int
    dateDemande: date
    dateReception: Optional[date] = None

class Secteurs(BaseModel):
    ID: Optional[int] = None
    libelle: str
    dateDebutValidite: Optional[date] = datetime.now().date()
    dateFinValidite: Optional[date] = date(3000,12,31)

class R_Secteur_Commande(BaseModel):
    ID: int
    secteur_id: int
    commande_id: int
    quantite: int

class edit_demande_commande_reception(BaseModel):
    commandeID: Optional[int] = None
    receptionID: Optional[int] = None
    sousCommandeID: Optional[int] = None
    articleID: Optional[int] = None
    date_Demande: Optional[date] = None
    date_Commande: Optional[date] = None
    date_Réception: Optional[date] = None
    date_Péremption: Optional[date] = None
    COA: Optional[bytes] = None
    Lot: Optional[str] = None
    editedValue: Optional[Union[int, date]] = None
    commentaire: Optional[str] = None
    quantité: Optional[int] = None



# class Stocks(BaseModel):
#     ID: int
#     article_id: int
#     quantiteInitiale: Optional[int] = None
#     quantiteRestante: Optional[int] = None
#     lot: Optional[str] = None
#     datePeremption: Optional[date] = None
#     dateReception: Optional[date] = None
#     COA: Optional[bytes] = None


# class GestionDesCouts(BaseModel):
#     ID: int
#     article_id: int
#     prixUnitaire: Optional[float] = None
#     dateDebutValidite: Optional[date] = None
#     dateFinValidite: Optional[date] = 31-12-3000


# class LieuxDeStockage(BaseModel):
#     ID: int
#     libelle: str
#     temperature: int


class Piece(BaseModel):
    ID: Optional[int] = None
    libelle: str
    dateDebutValidite: Optional[date] = datetime.now().date()
    dateFinValidite: Optional[date] = date(3000,12,31)

class edit_piece_or_secteur(BaseModel):
    ID: int
    libelle: Optional[str]= None
    dateDebutValidite: Optional[date] = None
    dateFinValidite: Optional[date] = None

# class r_articles_lieux(BaseModel):
#     ID: int
#     article_id: int
#     lieuxDeStockage_id: int

class r_articles_pieces(BaseModel):
    ID: int
    article_id: int
    piece_id: int


class r_articles_secteurs(BaseModel):
    ID: int
    article_id: int
    secteur_id: int


# class r_user_stock(BaseModel):
#     ID: int
#     user_id: int
#     stock_id: int
#     quantiteUpdate: int
#     dateUpdate: date


# class r_user_commande(BaseModel):
#     ID: int
#     user_id: int
#     commande_id: int
#     dateUpdate: date


class r_user_secteur(BaseModel):
    user_id: int
    secteur_libelle: str


# class usersdates(BaseModel):
#     ID: int
#     user_id: int
#     date: date
#     statut: str
