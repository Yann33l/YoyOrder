from sqlalchemy import Column, LargeBinary
from sqlalchemy.sql.sqltypes import DATE, Boolean, Integer, String

from .database import Base


class users(Base):
    __tablename__ = "users"

    ID = Column(Integer, primary_key=True, index=True)
    Email = Column(String(45))
    Admin = Column(Boolean)
    Acheteur = Column(Boolean)
    Demandeur = Column(Boolean)
    Password = Column(LargeBinary)
    Autorisation = Column(Boolean)


class articles(Base):
    __tablename__ = "articles"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    ref = Column(String(255))
    fournisseur_id = Column(Integer)
    conditionnement = Column(String(255))
    dateDebutValidite = Column(DATE)
    dateFinValidite = Column(DATE)


class fournisseurs(Base):
    __tablename__ = "fournisseurs"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    telephone = Column(String(20))
    email = Column(String(255))
    siteWeb = Column(String(255))
    getCertificatAnalyse = Column(String(255))


class commandes(Base):
    __tablename__ = "commandes"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer)
    dateCommande = Column(DATE)
    dateDemande = Column(DATE)
    dateReception = Column(DATE)


class secteurs(Base):
    __tablename__ = "secteurs"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))


class stocks(Base):
    __tablename__ = "stocks"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer)
    quantiteInitiale = Column(Integer)
    quantiteRestante = Column(Integer)
    lot = Column(String(255))
    datePeremption = Column(DATE)
    COA = Column(String(255))


class gestiondescouts(Base):
    __tablename__ = "gestiondescouts"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer)
    prixUnitaire = Column(Integer)
    dateDebutValidite = Column(DATE)
    dateFinValidite = Column(DATE)


class lieuxdestockage(Base):
    __tablename__ = "lieuxdestockage"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    temperature = Column(Integer)


class r_articles_lieux(Base):
    __tablename__ = "r_articles_lieux"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer)
    lieuDeStockage_id = Column(Integer)


class r_articles_secteurs(Base):
    __tablename__ = "r_articles_secteurs"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer)
    secteur_id = Column(Integer)

class r_articles_pieces(Base):
    __tablename__ = "r_articles_pieces"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer)
    piece_id = Column(Integer)


class r_user_stock(Base):
    __tablename__ = "r_user_stock"

    ID = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    stock_id = Column(Integer)
    quantiteUpdate = Column(Integer)
    dateUpdate = Column(DATE)


class r_user_commande(Base):
    __tablename__ = "r_user_commande"

    ID = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    commande_id = Column(Integer)
    dateUpdate = Column(DATE)

class r_secteur_commande(Base):
    __tablename__ = "r_secteur_commande"

    ID = Column(Integer, primary_key=True, index=True)
    secteur_id = Column(Integer)
    commande_id = Column(Integer)
    quantite = Column(Integer)

class r_user_secteur(Base):
    __tablename__ = "r_user_secteur"

    ID = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    secteur_id = Column(Integer)


class usersdates(Base):
    __tablename__ = "usersdates"

    ID = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    date = Column(DATE)
    statut = Column(String(255))

class pieces(Base):
    __tablename__ = "piece"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))

    