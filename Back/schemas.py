from datetime import date

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


class UserEditAutorisation (BaseModel):
    Email: str
    Autorisation: bool


class UserBase(BaseModel):
    Email: str
    Admin: bool
    Autorisation: bool

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
    conditionnement: str
    dateDebutValidite: date
    dateFinValidite: date


class Fournisseurs(BaseModel):
    ID: int
    libelle: str
    telephone: str
    email: str
    siteWeb: str
    getCertificatAnalyse: str


class Commandes(BaseModel):
    ID: int
    article_id: int
    quantite: int
    secteur_id: int
    dateCommande: date
    dateReception: date
    dateAchat: date


class Secteurs(BaseModel):
    ID: int
    libelle: str


class Stocks(BaseModel):
    ID: int
    article_id: int
    quantite: int
    secteur_id: int
    dateAchat: date
    datePeremption: date
    dateReception: date


class GestionDesCouts(BaseModel):
    ID: int
    article_id: int
    prixUnitaire: date
    dateDebutValidite: date
    dateFinValidite: date


class LieuxDeStockage(BaseModel):
    ID: int
    libelle: str
    temperature: int


class r_articles_lieux(BaseModel):
    ID: int
    article_id: int
    lieuxDeStockage_id: int


class r_articles_secteurs(BaseModel):
    ID: int
    article_id: int
    secteur_id: int


class r_user_stock(BaseModel):
    ID: int
    user_id: int
    stock_id: int
    quantiteUpdtae: int
    dateUpdate: date


class r_user_commande(BaseModel):
    ID: int
    user_id: int
    commande_id: int
    dateUpdate: date


class r_user_secteur(BaseModel):
    ID: int
    user_id: int
    secteur_id: int


class usersdates(BaseModel):
    ID: int
    user_id: int
    date: date
    statut: str
