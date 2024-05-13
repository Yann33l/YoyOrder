from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import LargeBinary

from .database import Base


class users(Base):
    __tablename__ = "users"

    ID = Column(Integer, primary_key=True, index=True)
    Email = Column(String(45))
    Admin = Column(Boolean)
    Acheteur = Column(Boolean)
    Demandeur = Column(Boolean)
    Editeur = Column(Boolean)
    Password = Column(LargeBinary)
    Autorisation = Column(Boolean)
    secteurs = relationship("secteurs", secondary="r_user_secteur")

class articles(Base):
    __tablename__ = "articles"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    ref = Column(String(255))
    fournisseur_id = Column(Integer, ForeignKey("fournisseurs.ID"))
    conditionnement = Column(String(255))
    dateDebutValidite = Column(Date)
    dateFinValidite = Column(Date)
    commentaire = Column(String(255))
    secteurs = relationship("secteurs", secondary="r_articles_secteurs")
    pieces = relationship("pieces", secondary="r_articles_pieces")

class sous_articles(Base):
    __tablename__ = "sous_articles"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    ref = Column(String(255))
    conditionnement = Column(String(255))
    dateDebutValidite = Column(Date)
    dateFinValidite = Column(Date)
    commentaire = Column(String(255))

class r_articles_sous_articles(Base):
    __tablename__ = "r_articles_sous_articles"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.ID"))
    sous_article_id = Column(Integer, ForeignKey("sous_articles.ID"))
    quantite = Column(Integer)


class fournisseurs(Base):
    __tablename__ = "fournisseurs"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    telephone = Column(String(20))
    email = Column(String(255))
    siteWeb = Column(String(255))
    getCertificatAnalyse = Column(String(255))
    dateDebutValidite = Column(Date)
    dateFinValidite = Column(Date)

class commandes(Base):
    __tablename__ = "commandes"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.ID"))
    dateCommande = Column(Date)
    dateDemande = Column(Date)
    enTotalite = Column(Boolean)
    commentaire = Column(String(255))
    commentaireDemandeur = Column(String(255))
    secteurs = relationship("secteurs", secondary="r_secteur_commande")

class sous_commandes(Base):
    __tablename__ = "sous_commandes"

    ID = Column(Integer, primary_key=True, index=True)
    commande_id = Column(Integer, ForeignKey("commandes.ID"))
    sous_article_id = Column(Integer, ForeignKey("sous_articles.ID"))
    quantite = Column(Integer)
    enTotalite = Column(Boolean)

class secteurs(Base):
    __tablename__ = "secteurs"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    dateDebutValidite = Column(Date)
    dateFinValidite = Column(Date)

class r_articles_secteurs(Base):
    __tablename__ = "r_articles_secteurs"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.ID"))
    secteur_id = Column(Integer, ForeignKey("secteurs.ID"))

class r_articles_pieces(Base):
    __tablename__ = "r_articles_pieces"

    ID = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.ID"))
    piece_id = Column(Integer, ForeignKey("piece.ID"))

class r_secteur_commande(Base):
    __tablename__ = "r_secteur_commande"

    ID = Column(Integer, primary_key=True, index=True)
    secteur_id = Column(Integer, ForeignKey("secteurs.ID"))
    commande_id = Column(Integer, ForeignKey("commandes.ID"))
    quantite = Column(Integer)

class r_user_secteur(Base):
    __tablename__ = "r_user_secteur"

    ID = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.ID"))
    secteur_id = Column(Integer, ForeignKey("secteurs.ID"))

class pieces(Base):
    __tablename__ = "piece"

    ID = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(255))
    dateDebutValidite = Column(Date)
    dateFinValidite = Column(Date)


class receptions(Base):
    __tablename__ = "receptions"

    ID = Column(Integer, primary_key=True, index=True)
    commande_id = Column(Integer, ForeignKey("commandes.ID"))
    sous_commande_id = Column(Integer)
    quantite = Column(Integer)
    dateReception = Column(Date)
    commentaire = Column(String(255))
    dateDebutUtilisation = Column(Date)
    dateFinUtilisation = Column(Date)
                         
class r_receptions_stock(Base):
    __tablename__ = "r_reception_stock"

    ID = Column(Integer, primary_key=True, index=True)
    reception_id = Column(Integer, ForeignKey("receptions.ID"))
    stock_id = Column(Integer, ForeignKey("stocks.ID"))

# class r_articles_lieux_stockage(Base):
#     __tablename__ = "r_articles_lieux"

#     ID = Column(Integer, primary_key=True, index=True)
#     article_id = Column(Integer)
#     lieuDeStockage_id = Column(Integer)

class stocks(Base):
    __tablename__ = "stocks"

    ID = Column(Integer, primary_key=True, index=True)
    quantiteInitiale = Column(Integer)
    quantiteRestante = Column(Integer)
    lot = Column(String(255))
    datePeremption = Column(Date)
    COA = Column(LargeBinary)


# class gestiondescouts(Base):
#     __tablename__ = "gestiondescouts"

#     ID = Column(Integer, primary_key=True, index=True)
#     article_id = Column(Integer)
#     prixUnitaire = Column(Integer)
#     dateDebutValidite = Column(DATE)
#     dateFinValidite = Column(DATE)


# class lieux_de_stockage(Base):
#     __tablename__ = "lieuxdestockage"

#     ID = Column(Integer, primary_key=True, index=True)
#     libelle = Column(String(255))
#     temperature = Column(Integer)

# class r_user_stock(Base):
#     __tablename__ = "r_user_stock"

#     ID = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer)
#     stock_id = Column(Integer)
#     quantiteUpdate = Column(Integer)
#     dateUpdate = Column(DATE)


# class r_user_commande(Base):
#     __tablename__ = "r_user_commande"

#     ID = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer)
#     commande_id = Column(Integer)
#     dateUpdate = Column(DATE)

# class usersdates(Base):
#     __tablename__ = "usersdates"

#     ID = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer)
#     date = Column(DATE)
#     statut = Column(String(255))