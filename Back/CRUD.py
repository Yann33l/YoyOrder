from datetime import date, datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session

from . import client_repository, models, schemas


# Users
def get_user_by_ID(db: Session, user_id: int):
    return db.query(models.users).filter(models.users.ID == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.users).filter(models.users.Email == email).scalar()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.users).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.users(
        Email=user.Email,
        Password=user.Password,
        Admin=False,
        Autorisation=False,
    )
    db.add(db_user)
    db.commit()
    return db_user


def edit_admin_status(db: Session, email: str, admin: bool):
    db_user = db.query(models.users).filter(
        models.users.Email == email).scalar()
    if db_user:
        db_user.Admin = admin
        db.commit()
        db.refresh(db_user)
    return db_user


def edit_autorisation_status(db: Session, email: str, autorisation: bool):
    db_user = db.query(models.users).filter(
        models.users.Email == email).scalar()
    if db_user:
        db_user.Autorisation = autorisation
        db.commit()
        db.refresh(db_user)
    return db_user


def edit_user_secteur(db: Session, user_id: int, secteur_id: int):
    db_user = db.query(models.users).filter(
        models.users.ID == user_id).scalar()
    r_user_secteur = db.query(models.r_user_secteur).filter(
        and_(models.r_user_secteur.user_id == db_user.ID,
             models.r_user_secteur.secteur_id == secteur_id)
    ).scalar()
    # si le secteur existe déjà pour l'utilisateur, on le supprime
    if db_user and r_user_secteur:
        db.delete(r_user_secteur)
        db.commit()
        db.refresh(db_user)
        return db_user
    else:
        # sinon on l'ajoute
        db_r_user_secteur = models.r_user_secteur(
            user_id=user_id,
            secteur_id=secteur_id,
        )
        db.add(db_r_user_secteur)
        db.commit()
        db.refresh(db_user)
        return db_user

    # sinon on l'ajoute


# Articles
def get_articles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.articles).offset(skip).limit(limit).all()


def get_articles_by_libelle(db: Session, libelle: str):
    return db.query(models.articles).filter(models.articles.libelle == libelle).first()


def liaison_article_lieuxdestockage(db: Session, article: schemas.ArticlesCreate):
    article_id = client_repository.get_articleID_by_data(
        article_libelle=article.libelle, article_ref=article.ref, article_fournisseur_id=article.fournisseur_id)
    lieuxdestockage_id = client_repository.get_stockageID_by_emplacement_and_temperature(
        article.lieuxDeStockage, article.temperature)
    db_r_article_lieuxdestockage = models.r_articles_lieux(
        article_id=article_id,
        lieuDeStockage_id=lieuxdestockage_id)
    db.add(db_r_article_lieuxdestockage)
    db.commit()
    db.refresh(db_r_article_lieuxdestockage)
    return db_r_article_lieuxdestockage


def liaison_article_to_secteur(db: Session, article_id: int, secteur_liste: list):
    print(secteur_liste)
    for secteur in secteur_liste:
        print(secteur)
        secteur_id = client_repository.get_secteurID_by_libelle(secteur)
        db_r_article_secteur = models.r_articles_secteurs(
            article_id=article_id,
            secteur_id=secteur_id)
        db.add(db_r_article_secteur)
        db.commit()
        db.refresh(db_r_article_secteur)
    return db_r_article_secteur


def create_article(db: Session, article: schemas.ArticlesCreate):
    print(article)
    db_article = models.articles(
        libelle=article.libelle,
        ref=article.ref,
        fournisseur_id=article.fournisseur_id,
        conditionnement=article.conditionnement,
        dateDebutValidite=date.today(),
        dateFinValidite=datetime(3000, 12, 31),)
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    liaison_article_lieuxdestockage(db, article)
    liaison_article_to_secteur(db, db_article.ID, article.secteur_liste)
    db_article.secteur_liste = article.secteur_liste
    db_article.temperature = article.temperature
    db_article.lieuxDeStockage = article.lieuxDeStockage
    return db_article


# Fournisseurs


def get_fournisseurs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.fournisseurs).offset(skip).limit(limit).all()


def create_fournisseur(db: Session, fournisseur: schemas.Fournisseurs):
    db_fournisseur = models.fournisseurs(
        libelle=fournisseur.libelle,
        telephone=fournisseur.telephone,
        email=fournisseur.email,
        siteWeb=fournisseur.siteWeb,
        getCertificatAnalyse=fournisseur.getCertificatAnalyse,
    )
    db.add(db_fournisseur)
    db.commit()
    return db_fournisseur

# Voir pour ne changer que les champs modifiés idem sur les autres edits


def edit_fournisseur(db: Session, fournisseur: schemas.Fournisseurs):
    db_fournisseur = db.query(models.fournisseurs).filter(
        models.fournisseurs.ID == fournisseur.ID).scalar()
    if db_fournisseur:
        db_fournisseur.libelle = fournisseur.libelle
        db_fournisseur.telephone = fournisseur.telephone
        db_fournisseur.email = fournisseur.email
        db_fournisseur.siteWeb = fournisseur.siteWeb
        db_fournisseur.getCertificatAnalyse = fournisseur.getCertificatAnalyse
        db.commit()
        db.refresh(db_fournisseur)
    return db_fournisseur

# Secteurs


def get_secteurs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.secteurs).offset(skip).limit(limit).all()


def create_secteur(db: Session, secteur: schemas.Secteurs):
    db_secteur = models.secteurs(
        ID=secteur.ID,
        libelle=secteur.libelle,
    )
    db.add(db_secteur)
    db.commit()
    return db_secteur


# Stocks


def get_stocks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.stocks).offset(skip).limit(limit).all()


def create_stock(db: Session, stock: schemas.Stocks):
    db_stock = models.stocks(
        ID=stock.ID,
        article_id=stock.article_id,
        quantiteInitiale=stock.quantiteInitiale,
        quantiteRestante=stock.quantiteRestante,
        lot=stock.lot,
        datePeremption=stock.datePeremption,
        COA=stock.COA,
    )
    db.add(db_stock)
    db.commit()
    return db_stock


def edit_stock(db: Session, stock: schemas.Stocks):
    db_stock = db.query(models.stocks).filter(
        models.stocks.ID == stock.ID).scalar()
    if db_stock:
        db_stock.article_id = stock.article_id
        db_stock.quantiteInitiale = stock.quantiteInitiale
        db_stock.quantiteRestante = stock.quantiteRestante
        db_stock.lot = stock.lot
        db_stock.datePeremption = stock.datePeremption
        db_stock.COA = stock.COA
        db.commit()
        db.refresh(db_stock)
    return db_stock

# Gestion des couts


def get_gestiondescouts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.gestiondescouts).offset(skip).limit(limit).all()


def create_gestiondescout(db: Session, gestiondescout: schemas.GestionDesCouts):
    db_gestiondescout = models.gestiondescouts(
        ID=gestiondescout.ID,
        article_id=gestiondescout.article_id,
        prixUnitaire=gestiondescout.prixUnitaire,
        dateDebutValidite=gestiondescout.dateDebutValidite,
        dateFinValidite=gestiondescout.dateFinValidite,
    )
    db.add(db_gestiondescout)
    db.commit()
    return db_gestiondescout


# Commandes
def get_commandes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.commandes).offset(skip).limit(limit).all()


def create_commande(db: Session, commande: schemas.Commandes):
    db_commande = models.commandes(
        ID=commande.ID,
        article_id=commande.article_id,
        quantite=commande.quantite,
        secteur_id=commande.secteur_id,
        dateCommande=commande.dateCommande,
        dateReception=commande.dateReception,
        dateAchat=commande.dateAchat,
    )
    db.add(db_commande)
    db.commit()
    return db_commande


def edit_commande(db: Session, commande: schemas.Commandes):
    db_commande = db.query(models.commandes).filter(
        models.commandes.ID == commande.ID).scalar()
    if db_commande:
        db_commande.article_id = commande.article_id
        db_commande.quantite = commande.quantite
        db_commande.secteur_id = commande.secteur_id
        db_commande.dateCommande = commande.dateCommande
        db_commande.dateReception = commande.dateReception
        db_commande.dateAchat = commande.dateAchat
        db.commit()
        db.refresh(db_commande)
    return db_commande


# Lieux de stockage
def get_lieuxdestockage(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.lieuxdestockage).offset(skip).limit(limit).all()


def create_lieuxdestockage(db: Session, lieuxdestockage: schemas.LieuxDeStockage):
    db_lieuxdestockage = models.lieuxdestockage(
        ID=lieuxdestockage.ID,
        libelle=lieuxdestockage.libelle,
        temperature=lieuxdestockage.temperature,
    )
    db.add(db_lieuxdestockage)
    db.commit()
    return db_lieuxdestockage


# gestion des dates
def get_usersdates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.usersdates).offset(skip).limit(limit).all()


def create_userdate(db: Session, userdate: schemas.usersdates):
    db_userdate = models.usersdates(
        ID=userdate.ID,
        user_id=userdate.user_id,
        date=userdate.date,
    )
    db.add(db_userdate)
    db.commit()
    return db_userdate

def get_pieces(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.pieces).offset(skip).limit(limit).all()