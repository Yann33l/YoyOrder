from sqlalchemy.sql.expression import text

from .database import engine
def get_secteurID_by_libelle(secteur_libelle):
    with engine.connect() as connection:
        query = text(
            "SELECT ID FROM secteurs WHERE libelle = :secteur_libelle")
        result = connection.execute(
            query, {"secteur_libelle": secteur_libelle})
        row = result.fetchone()
        if row:
            return row.ID
        else:
            return None

def get_secteur_labels():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs  WHERE dateFinValidite >= NOW() order by libelle;"))
        return [row.libelle for row in result.fetchall()]

def get_piece_labels():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT DISTINCT libelle FROM piece WHERE dateFinValidite >= NOW();"))
        return [row.libelle for row in result.fetchall()]

def get_users():
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT ID, libelle FROM secteurs WHERE dateFinValidite >= NOW() ORDER BY libelle;")).fetchall()

        select_part = ", ".join(
            [f"MAX(CASE WHEN s.libelle = '{s_label[1]}' THEN secteur_{s_label[0]}.libelle ELSE NULL END) AS libelle{s_label[0]}" for s_label in secteur_labels])
        
        join_part = " ".join([f"LEFT JOIN secteurs secteur_{s_label[0]} ON s.ID = {s_label[0]} AND s.dateFinValidite >= NOW() " for s_label in secteur_labels])

        query = text(f"SELECT u.ID, Email, Admin, Autorisation, Demandeur, Acheteur, Editeur, {select_part} "
                     "FROM users u "
                     "LEFT JOIN r_user_secteur r_us ON r_us.user_id = u.ID "
                     "LEFT JOIN secteurs s ON s.ID = r_us.secteur_id "
                     f"{join_part} "
                     "GROUP BY u.ID, Email, Admin, Autorisation;")

        result = connection.execute(query)
        return result.fetchall()


def get_stockageID_by_emplacement_and_temperature(stockage_libelle, temperature):
    with engine.connect() as connection:
        query = text(
            "SELECT ID FROM lieuxdestockage WHERE libelle = :stockage_libelle AND temperature = :temperature")
        result = connection.execute(
            query, {"stockage_libelle": stockage_libelle, "temperature": temperature})
        row = result.fetchone()
        if row:
            return row.ID
        else:
            return None


def get_articleID_by_data(article_libelle, article_ref, article_fournisseur_id):
    with engine.connect() as connection:
        query = text(
            "SELECT ID \
            FROM articles \
            WHERE libelle = :article_libelle \
            AND ref = :article_ref \
            AND fournisseur_id = :article_fournisseur_id")
        result = connection.execute(
            query, {"article_libelle": article_libelle, "article_ref": article_ref, "article_fournisseur_id": article_fournisseur_id})
        row = result.fetchone()
        if row:
            return row.ID
        else:
            return None

def get_pieces():
    with engine.connect() as connection:
        query = text(
            "SELECT ID, libelle FROM piece WHERE dateFinValidite >= NOW()")
        result = connection.execute(query)
        return result.fetchall()
    
def get_articles_by_secteur(piece_libelle):
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs WHERE dateFinValidite >= NOW() ORDER BY libelle;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        quantite_demande = text("(SELECT SUM(COALESCE(r_sc_sub.quantite, 0)) as quantite_demande "
             "FROM commandes c_sub "
             "LEFT JOIN r_secteur_commande r_sc_sub ON r_sc_sub.commande_id = c_sub.ID "
             "WHERE c_sub.article_id = a.ID "
             "AND c_sub.dateCommande IS NOT NULL "
             "AND (c_sub.enTotalite is null or c_sub.enTotalite = 0)) ")

        quantite_recu = text("(SELECT SUM(COALESCE(r_sub.quantite, 0)) as quantite_recu "
             "FROM commandes c_sub "
             "LEFT JOIN receptions r_sub ON r_sub.commande_id = c_sub.ID "
             "WHERE c_sub.article_id = a.ID "
             "AND (c_sub.enTotalite is null or c_sub.enTotalite = 0)) ")

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS quantite_{libelle}" for libelle in secteur_labels])

        query = text(f"SELECT c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, "
              "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              f"c.dateDemande, {select_part}, a.commentaire "
              f", {quantite_demande}-{quantite_recu} as quantite_en_attente "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (p.libelle like :piece_libelle or :piece_libelle='%') "
              "AND (c.dateDemande IS NULL OR (c.dateDemande IS NOT NULL AND c.dateCommande IS NULL) OR (c.dateDemande IS NOT NULL AND c.dateCommande < c.dateDemande)) "
              "AND a.dateFinValidite >= NOW() "
              f"GROUP BY c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateDemande, a.commentaire , quantite_en_attente "
              "ORDER BY a.ID DESC ")

        result = connection.execute(
            query, {"piece_libelle": piece_libelle})

        return result.fetchall()
    
def get_articles_to_receve(piece_libelle):
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs WHERE dateFinValidite >= NOW() order by libelle;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS 'quantite_{libelle}'" for libelle in secteur_labels])

        query = text(f"SELECT c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement,  "
              "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              f"c.dateDemande, c.dateCommande, max(r.dateReception), c.enTotalite , {select_part}, c.commentaireDemandeur, c.commentaire, r.commentaire, r.ID, r.quantite "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN receptions r ON r.commande_id = c.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (p.libelle like :piece_libelle or :piece_libelle='%') "
              "AND ((c.dateDemande and c.dateCommande) IS NOT NULL) "
              "AND (c.commentaire IS not NULL) "
              "AND (r.dateReception IS NULL OR r.dateReception = (SELECT MAX(dateReception) FROM receptions WHERE commande_id = c.ID)) "
              "AND (((c.enTotalite IS NULL or c.enTotalite = 0) or ((r.dateReception and c.enTotalite) IS NULL)) or (r.dateReception < c.dateCommande)) "
              "GROUP BY c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateCommande, c.dateDemande, c.enTotalite, c.commentaireDemandeur, r.commentaire, r.ID , r.quantite  "
              "ORDER BY a.ID DESC ")

        result = connection.execute(
            query, {"piece_libelle": piece_libelle})
        
        return result.fetchall()

    
def get_historique_commandes():
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs WHERE dateFinValidite >= NOW() order by libelle;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS 'quantite_{libelle}'" for libelle in secteur_labels])

        query = text(f"SELECT c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement,  "
              "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              f"c.dateDemande, c.dateCommande, r.dateReception, c.enTotalite, {select_part}, c.commentaireDemandeur, c.commentaire, r.commentaire, r.ID, r.quantite  "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN receptions r ON r.commande_id = c.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (c.dateDemande IS NOT NULL OR c.dateCommande IS NOT NULL OR c.commentaire IS NOT NULL) "
              "GROUP BY c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateCommande, c.dateDemande, r.dateReception, c.enTotalite,c.commentaireDemandeur,  r.commentaire, r.ID, r.quantite   "
              "ORDER BY a.ID DESC ")

        result = connection.execute(
            query)
        
        return result.fetchall()
        
def get_articles_to_buy():
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs WHERE dateFinValidite >= NOW() order by libelle;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS 'quantite_{libelle}'" for libelle in secteur_labels])

        query = text(f"SELECT DISTINCT c.ID, a.ID, a.libelle , a.ref, f.libelle, a.conditionnement, "
              f"(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              "c.dateDemande , c.dateCommande, "    
              f"{select_part}, a.commentaire, c.commentaire "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (c.dateDemande > c.dateCommande OR c.dateCommande IS NULL or (c.commentaire IS NULL AND c.dateDemande <= c.dateCommande)) "
              "AND c.dateDemande IS NOT NULL "
              "GROUP BY c.ID,a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateDemande, c.dateCommande "
              "ORDER BY a.ID DESC ")
        

        result = connection.execute(query)
        return result.fetchall()

def get_articles_to_edit():
    with engine.connect() as connection:
        piece_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM piece WHERE dateFinValidite >= NOW(); ")).fetchall()
        piece_labels = [libelle[0] for libelle in piece_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN p.libelle = '{libelle}' THEN 1 ELSE 0 END) AS 'piece_{libelle}'" for libelle in piece_labels])

        query = text(f"SELECT DISTINCT a.ID, a.libelle , a.ref, f.libelle, a.conditionnement, a.dateDebutValidite, a.dateFinValidite, "
              f"{select_part} "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "            
              "GROUP BY a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, a.dateDebutValidite, a.dateFinValidite "
              "ORDER BY a.ID DESC ")
        

        result = connection.execute(query)
        return result.fetchall()