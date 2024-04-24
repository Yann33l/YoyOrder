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
            # si l'article est composé, on crée une ligne de reception pour l'article complet (pour trtacer la quantité de kit complet reçu) et une ligne de sous-commande + une ligne de reception pour chaque sous-article 
            if db_r_articles_sous_articles:
                quantite = sum(secteur.quantite for secteur in db.query(models.r_secteur_commande).filter(models.r_secteur_commande.commande_id == commande.commandeID).all())
                db_reception_c = models.receptions(
                    commande_id=commande.commandeID,
                    quantite=None,
                    sous_commande_id = None,
                    dateReception=None,
                    commentaire=None,
                )
                db.add(db_reception_c)
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

def edit_réception_dateReception(db: Session, edit_reception: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == edit_reception.receptionID).scalar()
    db_commande = db.query(models.commandes).filter(models.commandes.ID == edit_reception.commandeID).scalar()
# sélection de la réception précédente pour vérifier que la date de réception est bien postérieure à la précédente
    if edit_reception.sousCommandeID:
        previous_db_reception = db.query(models.receptions).filter(models.receptions.sous_commande_id == edit_reception.sousCommandeID).order_by(models.receptions.dateReception.desc()).offset(1).first()
    else:
        previous_db_reception = db.query(models.receptions).filter(models.receptions.commande_id == edit_reception.commandeID).order_by(models.receptions.dateReception.desc()).offset(1).first()

    # Si la date de réception est superieur à la date de commande
    if edit_reception.date_Réception >= db_commande.dateCommande:
        condition1 = db_reception.dateReception is None
        if not condition1 :
            condition2 = db_reception.dateReception > edit_reception.date_Réception and (previous_db_reception is None or previous_db_reception.dateReception < edit_reception.date_Réception)
            condition3 = edit_reception.date_Réception > db_reception.dateReception and db_reception.quantite is None or db_reception.quantite == 0
            condition4 = edit_reception.date_Réception == db_reception.dateReception and db_reception.quantite is not None and db_reception.quantite != 0
            condition5 = edit_reception.date_Réception > db_reception.dateReception
     
        # et s'il n'y as pas de date de réception en bd, on modifie la date de réception
        # ou si la date de réception est inferieur à la date de la réception en cours, est superieur à la precedente réception (ou s'il n'y en a pas de precedente)
        # ou si la date de réception est superieur à la date de réception en cours, on modifie la date de réception si la quantité est nulle ou 0
        # alors on modifie la date de réception
        if condition1 or condition2 or condition3:
            db_reception.dateReception = edit_reception.date_Réception
            db.commit()
            db.refresh(db_commande)

        # si la date de réception est égale à la date de réception en cours, on crée une nouvelle réception uniquement si la quantité est différente de null ou 0
        # ou si la date de réception est superieur à la date de réception en cours
        # alors on crée une nouvelle réception
        elif condition4 or condition5:
            reception_incomplete = models.receptions(
            commande_id=edit_reception.commandeID,
            sous_commande_id=edit_reception.sousCommandeID if edit_reception.sousCommandeID else None, 
            quantite=None,
            dateReception=edit_reception.date_Réception,
            commentaire=db_reception.commentaire,
            )
            db.add(reception_incomplete)
            db.commit()
            db.refresh(db_commande)
    else:
        print("erreur de saisie de date de réception")
    return db_commande

def edit_reception_commentaire(db: Session, receptions: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == receptions.receptionID).scalar()
    if db_reception:
        db_reception.commentaire = receptions.commentaire_Reception
        db.commit()
        db.refresh(db_reception)
    return db_reception

def edit_commande_ReceptionEnTotalite(db: Session, edition: schemas.edit_demande_commande_reception):
    if edition.sousCommandeID:
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
    db_r_receptions_stock = db.query(models.r_receptions_stock).filter(models.r_receptions_stock.reception_id == reception.receptionID).scalar()
    # si la réception existe et qu'il y a un lien entre la réception et le stock
    print(type(db_r_receptions_stock))
    if db_r_receptions_stock is not None:
        print("1")
        db_stock = db.query(models.stocks).filter(models.stocks.ID == db_r_receptions_stock.stock_id).scalar()
        if db_reception and db_stock is not None:
            print("2")
            if db_reception.quantite is None:
                print("3")
                précédente_quantité = 0
            else:
                print("4")
                précédente_quantité = db_reception.quantite
            # on ajoute la quantité dans le lot et dans la réception
            db_reception.quantite = reception.quantité_Reçue
            db_stock.quantiteRestante += db_reception.quantite - précédente_quantité
            db_stock.quantiteInitiale += db_reception.quantite - précédente_quantité
            db.commit()
            db.refresh(db_reception)
            db.refresh(db_stock)
            return db_reception
        
    # s'il n'y a pas de lien entre la réception et le stock
    elif db_reception :
        print("5")
        # on ajoute la quantité dans la réception
        db_reception.quantite = reception.quantité_Reçue
        db.commit()
        # on vérifie si le lot existe en bd
        db_lots_existants_pour_cet_article = client_repository.get_stocks_par_commandeID_ou_sous_commandeID(reception)
        # si il y a des lots pour cet article en bd
        if db_lots_existants_pour_cet_article is not None:
            print("6")  
            print("db_lots_existants_pour_cet_article", db_lots_existants_pour_cet_article)   
            # on cherche si le lot existe déjà pour cet article       
            for lot in db_lots_existants_pour_cet_article:
                print("lot[1]", lot[1])
                print("reception.Lot", reception.Lot)
                if reception.Lot is None:
                    reception.Lot = ""
                print("reception.Lot no none", reception.Lot)
                if lot[1] == reception.Lot if reception.Lot is not None else "":
                    print ("7 lot trouvé => ajout de la quantité dans le lot")
                    db_stock = db.query(models.stocks).filter(models.stocks.ID == lot[0]).scalar()
                # si le lot existe, on lie le lot à la réception
                # on ajoute la quantité dans le lot
                    db_stock.quantiteInitiale += reception.quantité_Reçue
                    db_stock.quantiteRestante += reception.quantité_Reçue
                    db_r_receptions_stock = models.r_receptions_stock(
                        reception_id=reception.receptionID,
                        stock_id=db_stock.ID,
                    )
                    db.add(db_r_receptions_stock)
                    db.commit()
                    db.refresh(db_r_receptions_stock)
                    return db_r_receptions_stock
            else:   
                print("7 Lot n'existe pas => création d'un nouveau lot")
                # si le lot n'existe pas, on crée un nouveau lot
                db_stock = models.stocks(
                    quantiteInitiale=reception.quantité_Reçue,
                    quantiteRestante=reception.quantité_Reçue,
                    lot=reception.Lot if reception.Lot is not None else "",
                    datePeremption=None,
                    COA=None,
                )
                db.add(db_stock)
                db.commit()
                db.refresh(db_stock)
                db_r_receptions_stock = models.r_receptions_stock(
                    reception_id=reception.receptionID,
                    stock_id=db_stock.ID,
                )
                db.add(db_r_receptions_stock)
                db.commit()
                db.refresh(db_r_receptions_stock)
                return db_r_receptions_stock
        # si il n'y a pas de lot pour cet article en bd
        else:
            print("8")
            db_stock = models.stocks(
                quantiteInitiale=reception.quantité_Reçue,
                quantiteRestante=reception.quantité_Reçue,
                lot=reception.Lot if reception.Lot is not None else "",
                datePeremption=None,
                COA=None,
            )
            db.add(db_stock)
            db.commit()
            db.refresh(db_stock)
            db_r_receptions_stock = models.r_receptions_stock(
                reception_id=reception.receptionID,
                stock_id=db_stock.ID,
            )
            db.add(db_r_receptions_stock)
            db.commit()
            db.refresh(db_r_receptions_stock)
        return db_r_receptions_stock

def edit_reception_Lot(db: Session, reception: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == reception.receptionID).scalar()
    db_lots_existants_pour_cet_article = client_repository.get_stocks_par_commandeID_ou_sous_commandeID(reception)
    db_r_receptions_stock = db.query(models.r_receptions_stock).filter(models.r_receptions_stock.reception_id == reception.receptionID).scalar()
    if db_r_receptions_stock:
        db_stock = db.query(models.stocks).filter(models.stocks.ID == db_r_receptions_stock.stock_id).scalar()
    def création_stocks(): 
        db_stocks = models.stocks(
            quantiteInitiale=db_reception.quantite if db_reception.quantite is not None else 0,
            quantiteRestante=db_reception.quantite if db_reception.quantite is not None else 0,
            lot=reception.Lot,
            datePeremption=None,
            COA=None,
        )
        db.add(db_stocks)
        db.commit()
        db.refresh(db_stocks)
        return db_stocks  
    def création_r_receptions_stock(db_stocks):
        db_r_receptions_stock = models.r_receptions_stock(
            reception_id=reception.receptionID,
            stock_id=db_stocks.ID,
        )
        db.add(db_r_receptions_stock)
        db.commit()
        db.refresh(db_r_receptions_stock)
        return db_r_receptions_stock
    def vérfication_de_l_existance_du_lot_saisie(db_r_receptions_stock):

        for db_lot in db_lots_existants_pour_cet_article :
            # si provient du cas ou il y a un lot déjà renseigné pour cette réception et que le lot existe, on modifie la relation entre la réception et le lot
            # on retire la quantité au lot précédent
            # on ajoute la quantité dans le nouveau lot
            if db_lot[1] == reception.Lot and db_r_receptions_stock :  
                if db_reception and db_stock:
                    if db_reception.quantite is None:
                        précédente_quantité = 0
                    else:
                        précédente_quantité = db_reception.quantite
                db_stock.quantiteRestante -= précédente_quantité
                db_stock.quantiteInitiale -= précédente_quantité
                db_r_receptions_stock.stock_id = db_lot[0]
                db.commit()
                db.refresh(db_r_receptions_stock)
                db_nouveaux_stocks = db.query(models.stocks).filter(models.stocks.ID == db_r_receptions_stock.stock_id).scalar()
                print(db_nouveaux_stocks.quantiteInitiale)
                print(db_reception.quantite)
                print(db_nouveaux_stocks.quantiteRestante+db_reception.quantite)
                if db_reception.quantite is not None:
                    db_nouveaux_stocks.quantiteInitiale += db_reception.quantite
                    print(db_nouveaux_stocks.quantiteInitiale)
                    db_nouveaux_stocks.quantiteRestante += db_reception.quantite
                    db.commit()
                    db.refresh(db_nouveaux_stocks)

                return db_r_receptions_stock
            # si le lot existe mais qu'il n'y a pas de lot renseigné pour cette réception, on lie le lot à la réception
            # on ajoute la quantité dans le lot
            elif db_lot[1] == reception.Lot and not db_r_receptions_stock :
                db_r_receptions_stock = models.r_receptions_stock(
                reception_id=reception.receptionID,
                stock_id= db_lot[0],
                )
                db.add(db_r_receptions_stock)
                db.commit()
                db.refresh(db_r_receptions_stock)
                db.refresh(db_r_receptions_stock)
                db_nouveaux_stocks = db.query(models.stocks).filter(models.stocks.ID == db_r_receptions_stock.stock_id).scalar()
                db_nouveaux_stocks.quantiteInitiale += db_reception.quantite if db_reception.quantite is not None else 0,
                db_nouveaux_stocks.quantiteRestante += db_reception.quantite if db_reception.quantite is not None else 0,
                return db_r_receptions_stock
            
    def le_lot_modifié_n_existera_plus(db_stocks_a_supprimer):
        db.delete(db_stocks_a_supprimer)
        db.commit()
        db.refresh(db_stocks_a_supprimer)
        return db_stocks_a_supprimer
    # si il y a un lot déjà renseigné pour cette réception
    if db_r_receptions_stock:
        # le lot est il utilisé pour une autre réception ?
        réception_utilisant_ce_lot = db.query(models.r_receptions_stock).filter(models.r_receptions_stock.stock_id == db_r_receptions_stock.stock_id).all()
        # si non
        if len(réception_utilisant_ce_lot) == 1:
            # on cherche si le lot existe déjà pour cet article si oui => on lie le lot à la réception
            if vérfication_de_l_existance_du_lot_saisie(db_r_receptions_stock):

                le_lot_modifié_n_existera_plus(db_stock)
                return db_r_receptions_stock
            # si le lot n'existe pas, on crée un nouveau lot
            db_stocks_a_supprimer = db_stock
            db_stocks = db.query(models.stocks).filter(models.stocks.ID == db_r_receptions_stock.stock_id).scalar()
            db_stocks.lot = reception.Lot
            db.commit()
            db.refresh(db_stocks)
            le_lot_modifié_n_existera_plus(db_stocks_a_supprimer)
            return db_stocks
        
        # si oui, 
        else:
            print("e")
            # on cherche si le lot existe déjà pour cet article
            if vérfication_de_l_existance_du_lot_saisie(db_r_receptions_stock):
                return
            # si le lot n'existe pas, on crée un nouveau lot
            # on retire la quantité du lot en cours
            # on ajoute la quantité dans le nouveau lot
            else :
                print("sortie de e aa ")
                if db_reception and db_stock:
                    if db_reception.quantite is None:
                        précédente_quantité = 0
                    else:
                        précédente_quantité = db_reception.quantite
                db_stock.quantiteRestante -= précédente_quantité
                db_stock.quantiteInitiale -= précédente_quantité
                db_stocks = création_stocks()
                db_r_receptions_stock.stock_id = db_stocks.ID
                db.commit()
                db.refresh(db_stocks)
                return db_stocks

    # si la réception existe, qu'il n'y a pas de lot pour cette réception mais qu'il existe au moins un lot pour cet article en bd
    elif db_reception and db_lots_existants_pour_cet_article:
        # on cherche si le lot existe déjà pour cet article
        if vérfication_de_l_existance_du_lot_saisie(db_r_receptions_stock):
            return
        # si le lot n'existe pas, on crée un nouveau lot
        else :
            db_stocks = création_stocks()
            db_r_receptions_stock = création_r_receptions_stock(db_stocks)
            return db_r_receptions_stock
    
    # si la réception existe, qu'il n'y a pas de lot pour cette réception et qu'il n'y a pas de lot pour cet article en bd on crée un nouveau lot
    elif db_reception:
        db_stocks = création_stocks()
        db_r_receptions_stock = création_r_receptions_stock(db_stocks)
        return db_r_receptions_stock

def edit_réception_datePéremption(db: Session, edit_reception: schemas.edit_demande_commande_reception):
    db_reception = db.query(models.receptions).filter(models.receptions.ID == edit_reception.receptionID).scalar()
    db_r_reception_stock = db.query(models.r_receptions_stock).filter(models.r_receptions_stock.reception_id == edit_reception.receptionID).scalar()
    if db_reception and db_r_reception_stock:
        db_stock = db.query(models.stocks).filter(models.stocks.ID == db_r_reception_stock.stock_id).scalar()
        db_stock.datePeremption = edit_reception.date_Péremption
        db.commit()
        db.refresh(db_stock)
    return db_stock

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


def uploadCOA(db: Session, COA: schemas.COA):
    db_stock = db.query(models.stocks).filter(models.stocks.ID == COA.stockID).scalar()
    if db_stock:
        db_stock.COA = COA.COA
        db.commit()
        db.refresh(db_stock)
    return db_stock

def getCOA(db: Session, stockID: int):
    return db.query(models.stocks).filter(models.stocks.ID == stockID).scalar().COA
