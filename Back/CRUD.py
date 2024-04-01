from datetime import date, datetime
from fastapi import HTTPException

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
        Acheteur=False,
        Demandeur=False,
        Editeur=False,
    )
    db.add(db_user)
    db.commit()
    return db_user

def edit_user_status(db: Session, email: str, admin: bool = None, autorisation: bool = None, acheteur: bool = None, demandeur: bool = None, editeur: bool = None):
    db_user = db.query(models.users).filter(
        models.users.Email == email).scalar()

    if db_user:
        if admin is not None:
            db_user.Admin = admin
        elif autorisation is not None:
            db_user.Autorisation = autorisation
        elif acheteur is not None:
            db_user.Acheteur = acheteur
        elif demandeur is not None:
            db_user.Demandeur = demandeur
        elif editeur is not None:
            db_user.Editeur = editeur

        db.commit()
        db.refresh(db_user)
        return db_user

    raise HTTPException(status_code=404, detail="User not found")

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
def get_articles(db: Session):
    return db.query(models.articles).all()

def get_active_articles(db: Session):
    return db.query(models.articles).filter(models.articles.dateFinValidite >= datetime.now().date()).all()

def get_articles_by_libelle(db: Session, libelle: str):
    return db.query(models.articles).filter(models.articles.libelle == libelle).first()

def get_articles_by_ref(db: Session, ref: str):
    return db.query(models.articles).filter(models.articles.ref == ref).first()

#def liaison_article_lieuxdestockage(db: Session, article: schemas.ArticlesCreate):
#    article_id = client_repository.get_articleID_by_data(
#        article_libelle=article.libelle, article_ref=article.ref, article_fournisseur_id=article.fournisseur_id)
#    lieuxdestockage_id = client_repository.get_stockageID_by_emplacement_and_temperature(
#        article.lieuxDeStockage, article.temperature)
#    db_r_article_lieuxdestockage = models.r_articles_lieux(
#        article_id=article_id,
#        lieuDeStockage_id=lieuxdestockage_id)
#    db.add(db_r_article_lieuxdestockage)
#    db.commit()
#    db.refresh(db_r_article_lieuxdestockage)
#    return db_r_article_lieuxdestockage


def liaison_article_to_secteur(db: Session, article_id: int, secteur_liste: list):
    for secteur in secteur_liste:
        secteur_id = get_secteurID_by_libelle(secteur)
        db_r_article_secteur = models.r_articles_secteurs(
            article_id=article_id,
            secteur_id=secteur_id)
        db.add(db_r_article_secteur)
        db.commit()
        db.refresh(db_r_article_secteur)
    return db_r_article_secteur

def liaison_article_piece(db: Session, article: schemas.ArticlesCreate):
    try :
        article_id = client_repository.get_articleID_by_data(
            article_libelle=article.libelle, article_ref=article.ref, article_fournisseur_id=article.fournisseur_id)
        for piece_id in article.piece_liste:
            db_r_article_piece = models.r_articles_pieces(
                article_id=article_id,
                piece_id=piece_id)
            db.add(db_r_article_piece)
            db.commit()
            db.refresh(db_r_article_piece)
        return db_r_article_piece
    except:
        raise HTTPException(status_code=404, detail="Piece non selectionnée")
    
    
def create_article(db: Session, article: schemas.ArticlesCreate):
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
#    liaison_article_lieuxdestockage(db, article)
    try : liaison_article_piece(db, article)
    except: pass
    return db_article

def create_compositionArticle(db: Session, composanteArticle: schemas.SousArticlesCreation):
    db_sousArticle = models.sous_articles(
        libelle=composanteArticle.libelle,
        ref=composanteArticle.ref,
        conditionnement=composanteArticle.conditionnement,
        dateDebutValidite=date.today(),
        dateFinValidite=datetime(3000, 12, 31),)
    db.add(db_sousArticle)
    db.commit()
    for articleLié in composanteArticle.articles_ids :
        db_r_article_sousArticle = models.r_articles_sous_articles(
            article_id=articleLié,
            sous_article_id=db_sousArticle.ID,
            quantite=composanteArticle.quantite)
        db.add(db_r_article_sousArticle)
        db.commit()
        db.refresh(db_sousArticle)
    dataAdded = db_sousArticle
    dataAdded.articles_ids = composanteArticle.articles_ids
    dataAdded.quantite = composanteArticle.quantite
    return dataAdded



def get_pieceID_by_libelle(db: Session, piece_libelle: str):
    piece = db.query(models.pieces).filter(models.pieces.libelle == piece_libelle).scalar()
    return piece.ID

def edit_article(db: Session, article: schemas.ArticlesEdit):
    db_article = db.query(models.articles).filter(
        models.articles.ID == article.articleID).scalar()
    if db_article:
        for key, value in article.model_dump().items():
            if value is not None and key != "ID" and key != "secteurEdited" and key != "newSecteurValue":
                setattr(db_article, key, value)
                db.commit()
                db.refresh(db_article)
    return db_article

def edit_sous_article(db: Session, sous_article: schemas.SousArticlesEdit):
    db_sous_article = db.query(models.sous_articles).filter(
        models.sous_articles.ID == sous_article.sousArticleID).scalar()
    db_r_article_sous_article = db.query(models.r_articles_sous_articles).filter(
        models.r_articles_sous_articles.sous_article_id == sous_article.sousArticleID, models.r_articles_sous_articles.article_id == sous_article.articleID).scalar()
    if db_sous_article:
        for key, value in sous_article.model_dump().items():
            if key == "quantite" and value is not None and db_r_article_sous_article is not None:
                db_r_article_sous_article.quantite = value
                db.commit()
                db.refresh(db_r_article_sous_article)
            if value is not None and key != "ID":
                setattr(db_sous_article, key, value)
                db.commit()
                db.refresh(db_sous_article)
    return db_sous_article


def edit_article_piece(db: Session, piece_id: int, article_id: int):
    db_article = db.query(models.articles).filter(
        models.articles.ID == article_id).scalar()
    r_article_piece = db.query(models.r_articles_pieces).filter(
        models.r_articles_pieces.article_id == article_id,
        models.r_articles_pieces.piece_id == piece_id).scalar()
    if db_article and r_article_piece:
        db.delete(r_article_piece)
        db.commit()
        db.refresh(db_article)
        return db_article
    else:
        r_article_piece = models.r_articles_pieces(
            article_id=article_id,
            piece_id=piece_id,
        )
        db.add(r_article_piece)
        db.commit()
        db.refresh(db_article)
        return db_article
 

def get_fournisseurs(db: Session):
    return db.query(models.fournisseurs).all()

def get_fournisseurs_actifs(db: Session):
    return db.query(models.fournisseurs).where(models.fournisseurs.dateFinValidite >= date.today()).all()

def create_fournisseur(db: Session, fournisseur: schemas.Fournisseurs):
    db_fournisseur = models.fournisseurs(
        libelle=fournisseur.libelle,
        telephone=fournisseur.telephone,
        email=fournisseur.email,
        siteWeb=fournisseur.siteWeb,
        getCertificatAnalyse=fournisseur.getCertificatAnalyse,
        dateDebutValidite=date.today(),
        dateFinValidite=datetime(3000, 12, 31),)
    
    db.add(db_fournisseur)
    db.commit()
    return db_fournisseur


def edit_fournisseur(db: Session, fournisseur: schemas.FournisseursEdit):
    db_fournisseur = db.query(models.fournisseurs).filter(
        models.fournisseurs.ID == fournisseur.ID).scalar()
    if db_fournisseur:
        for key, value in fournisseur.model_dump().items():
            if value is not None and key != "ID" :
                setattr(db_fournisseur, key, value)
                db.commit()
                db.refresh(db_fournisseur)
    return db_fournisseur

def get_fournisseur_by_libelle(db: Session, libelle: str): 
    return db.query(models.fournisseurs).filter(models.fournisseurs.libelle == libelle).scalar()

# Secteurs
def get_pieces(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.pieces).offset(skip).limit(limit).all()

def get_secteurs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.secteurs).offset(skip).limit(limit).all()


def create_secteur(db: Session, secteur: schemas.Secteurs):
    db_secteur = models.secteurs(
        libelle=secteur.libelle,
        dateDebutValidite=date.today(),
        dateFinValidite=datetime(3000, 12, 31),)
    db.add(db_secteur)
    db.commit()
    return db_secteur

def get_secteur_by_libelle(db: Session, libelle: str):
    return db.query(models.secteurs).filter(models.secteurs.libelle == libelle).scalar()


# Commandes

def edit_demmande_dateDemande(db: Session, commande: schemas.edit_demande_commande_reception):
    db_commande = db.query(models.commandes).filter(
        models.commandes.ID == commande.commandeID).scalar()
    
    if db_commande is None or (db_commande.dateCommande is not None and db_commande.dateCommande < commande.editedValue):
        db_commande = models.commandes(
            dateDemande = commande.editedValue,
            article_id = commande.articleID,)
        db.add(db_commande)
        db.commit()
    
    elif db_commande.dateCommande is None or db_commande.dateCommande > commande.editedValue:
        db_commande.dateDemande = commande.editedValue
        db.commit()
        db.refresh(db_commande)

    return db_commande

def edit_article_commentaire(db: Session, demande: schemas.edit_demande_commande_reception):
    db_article = db.query(models.articles).filter(
        models.articles.ID == demande.articleID).scalar()
    if db_article:
        db_article.commentaire = demande.commentaire
        db.commit()
        db.refresh(db_article)
    return db_article



def get_secteurID_by_libelle(db: Session, secteur_libelle: str):
    return db.query(models.secteurs).filter(models.secteurs.libelle == secteur_libelle).scalar().ID


def edit_demmande_quantite(db: Session, commande: schemas.edit_demande_commande_reception, secteur_libelle):
    db_r_secteur_commande = db.query(models.r_secteur_commande).filter(
        models.r_secteur_commande.commande_id == commande.commandeID,
        models.r_secteur_commande.secteur_id == get_secteurID_by_libelle(db, secteur_libelle)).scalar()
    try:
        if db_r_secteur_commande is None:
            db_commande = db.query(models.commandes).filter(
                models.commandes.ID == commande.commandeID).scalar()
            if db_commande is None:
                db_commande = models.commandes(
                    dateDemande=None,
                    article_id=commande.articleID,
                )
                db.add(db_commande)
                db.commit()
                commande.commandeID = db_commande.ID
                db_r_secteur_commande = models.r_secteur_commande(
                    commande_id=commande.commandeID,
                    secteur_id=get_secteurID_by_libelle(db, secteur_libelle),
                    quantite=commande.editedValue,)
            else:
                db_r_secteur_commande = models.r_secteur_commande(
                    commande_id=commande.commandeID,
                    secteur_id=get_secteurID_by_libelle(db, secteur_libelle),
                    quantite=commande.editedValue,)
            db.add(db_r_secteur_commande)
            db.commit()
            db.refresh(db_r_secteur_commande)
            return db_r_secteur_commande
        else:
            db_r_secteur_commande.quantite = commande.editedValue
            db.commit()
            db.refresh(db_r_secteur_commande)
            return db_r_secteur_commande
    except: 
        raise HTTPException(status_code=404, detail="Secteur not found")
    

def edit_commande_dateCommande(db: Session, commande: schemas.edit_demande_commande_reception):
    db_commande = db.query(models.commandes).filter(
        models.commandes.ID == commande.commandeID).scalar()
    db_article = db.query(models.articles).filter(
        models.articles.ID == commande.articleID).scalar()
    db_r_articles_sous_articles = db.query(models.r_articles_sous_articles).filter(
        models.r_articles_sous_articles.article_id == commande.articleID).all()
    if db_commande and db_commande.dateDemande <= commande.editedValue:
        # si la date de commande est nulle, on crée une nouvelle ligne de commande vide pour l'article
        if db_commande.dateCommande is None :
            db_commande2 = models.commandes(article_id = db_commande.article_id,)
            db.add(db_commande2)
            # si l'article est composé, on crée une ligne de sous-commande + une ligne de reception pour chaque sous-article et une ligne de reception pour l'article complet (pour trtacer la quantité de kit complet reçu)
            if db_r_articles_sous_articles:
                quantite = sum(secteur.quantite for secteur in db.query(models.r_secteur_commande).filter(models.r_secteur_commande.commande_id == commande.commandeID).all())
                for sous_article in db_r_articles_sous_articles:
                    db_sous_commandes = models.sous_commandes(
                        sous_article_id = sous_article.sous_article_id,
                        commande_id = commande.commandeID,
                        quantite = sous_article.quantite*quantite,
                    )
                    db.add(db_sous_commandes)
                    db.commit()

                    db_reception_sc = models.receptions(
                        commande_id=commande.commandeID,
                        sous_commande_id = db_sous_commandes.ID,
                        quantite=None,
                        dateReception=None,
                        commentaire=None,
                    )
                    db.add(db_reception_sc)
                db_reception_c = models.receptions(
                    commande_id=commande.commandeID,
                    quantite=None,
                    sous_commande_id = None,
                    dateReception=None,
                    commentaire=None,
                )
                db.add(db_reception_c)
            else :
                db_reception = models.receptions(
                    commande_id=commande.commandeID,
                    quantite=None,
                    sous_commande_id = None,
                    dateReception=None,
                    commentaire=None,
                )
                db.add(db_reception)

        db_commande.dateCommande = commande.editedValue
    if db_article :
        if db_article.commentaire != db_commande.commentaireDemandeur:
            db_commande.commentaireDemandeur = db_article.commentaire
            db.commit()
            db.refresh(db_article)
    db.commit()
    db.refresh(db_commande)
    db.refresh(db_reception)
    return db_commande

def edit_commande_commentaire(db: Session, commande: schemas.edit_demande_commande_reception):
    db_commande = db.query(models.commandes).filter(
        models.commandes.ID == commande.commandeID).scalar()
    db_article = db.query(models.articles).filter(
        models.articles.ID == commande.articleID).scalar()
    if db_commande:
        db_commande.commentaire = commande.commentaire
        db.commit()
        db.refresh(db_commande)
    if db_article :
        if db_article.commentaire != db_commande.commentaireDemandeur:
            db_commande.commentaireDemandeur = db_article.commentaire
            db.commit()
            db.refresh(db_article)
    return db_commande


def edit_commande_dateReception(db: Session, edit_reception: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == edit_reception.receptionID).scalar()
    db_commande = db.query(models.commandes).filter(models.commandes.ID == edit_reception.commandeID).scalar()
# sélection de la réception précédente pour vérifier que la date de réception est bien postérieure à la précédente
    if edit_reception.sousCommandeID:
        previous_db_reception = db.query(models.receptions).filter(models.receptions.sous_commande_id == edit_reception.sousCommandeID).order_by(models.receptions.dateReception.desc()).offset(1).first()
    else:
        previous_db_reception = db.query(models.receptions).filter(models.receptions.commande_id == edit_reception.commandeID).order_by(models.receptions.dateReception.desc()).offset(1).first()

# s'il ny as pas de date de réception et que la date de réception est postérieure à la date de commande, on modifie la date de réception
    if (db_reception.dateReception is None and edit_reception.editedValue >= db_commande.dateCommande):
        db_reception.dateReception = edit_reception.editedValue
        db.commit()
        db.refresh(db_commande)

# si la date de réception est inferieur à la date de la réception en cours, 
# est superieure à la precedente réception (ou s'il n'y en a pas de precedente)
# et est postérieure à la date de commande, on modifie la date de réception
    elif db_reception.dateReception > edit_reception.editedValue and (previous_db_reception is None or previous_db_reception.dateReception < edit_reception.editedValue) and edit_reception.editedValue >= db_commande.dateCommande:
        db_reception.dateReception = edit_reception.editedValue
        db.commit()
        db.refresh(db_commande)

# si la date de réception est postérieure à la date de commande et à la date de réception en cours, on crée une nouvelle réception
    elif (edit_reception.editedValue >= db_commande.dateCommande and edit_reception.editedValue > db_reception.dateReception):
        reception_incomplete = models.receptions(
        commande_id=edit_reception.commandeID,
        sous_commande_id=edit_reception.sousCommandeID if edit_reception.sousCommandeID else None, 
        quantite=None,
        dateReception=edit_reception.editedValue,
        commentaire=db_reception.commentaire,
        )
        db.add(reception_incomplete)
        db.commit()
        db.refresh(db_commande)
    return db_commande

def edit_reception_commentaire(db: Session, receptions: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == receptions.receptionID).scalar()
    if db_reception:
        db_reception.commentaire = receptions.commentaire
        db.commit()
        db.refresh(db_reception)
    return db_reception

def edit_commande_ReceptionEnTotalite(db: Session, edition: schemas.edit_demande_commande_reception):
    if edition.sousCommandeID:
        print("sousCommandeID" , edition.sousCommandeID)
        db_commande = db.query(models.sous_commandes).filter(
            models.sous_commandes.ID == edition.sousCommandeID).scalar()
    else:
        db_commande = db.query(models.commandes).filter(
            models.commandes.ID == edition.commandeID).scalar()
    if db_commande:
        db_commande.enTotalite = edition.editedValue
        db.commit()
        db.refresh(db_commande)

    return db_commande

def edit_reception_Quantite(db: Session, reception: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == reception.receptionID).scalar()
    if db_reception :
        db_reception.quantite = reception.quantité
        db.commit()
        db.refresh(db_reception)
    return db_reception



# def edit_commande_ReceptionEnTotalite(db: Session, commande: schemas.edit_demande_commande_reception):
#     db_commande = db.query(models.commandes).filter(
#         models.commandes.ID == commande.commandeID).scalar()
#     if db_commande:
#         db_commande.enTotalite = commande.editedValue
#         db.commit()
#         db.refresh(db_commande)
#     return db_commande

def create_piece(db: Session, piece: schemas.Piece):
    db_piece = models.pieces(
        libelle=piece.libelle,
        dateDebutValidite=date.today(),
        dateFinValidite=datetime(3000, 12, 31),)
    db.add(db_piece)
    db.commit()
    return db_piece

def get_piece_by_libelle(db: Session, libelle: str):
    return db.query(models.pieces).filter(models.pieces.libelle == libelle).scalar()

def edit_piece(db: Session, piece: schemas.edit_piece_or_secteur):
    db_piece = db.query(models.pieces).filter(
        models.pieces.ID == piece.ID).scalar()
    if db_piece:
        for key, value in piece.model_dump().items():
            if value is not None and key != "ID" :
                setattr(db_piece, key, value)
                db.commit()
                db.refresh(db_piece)
    return db_piece

def edit_secteur(db: Session, secteur: schemas.edit_piece_or_secteur):
    db_secteur = db.query(models.secteurs).filter(
        models.secteurs.ID == secteur.ID).scalar()
    if db_secteur:
        for key, value in secteur.model_dump().items():
            if value is not None and key != "ID" :
                setattr(db_secteur, key, value)
                db.commit()
                db.refresh(db_secteur)
    return db_secteur