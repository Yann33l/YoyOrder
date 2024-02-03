from sqlalchemy.sql.expression import text

from .database import engine


def get_secteur_labels():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs;"))
        return [row.libelle for row in result.fetchall()]


def get_users():

    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs;")).fetchall()

        select_part = ", ".join(
            [f"MAX(CASE WHEN s.ID = {s_id} THEN secteur_{s_id}.libelle ELSE NULL END) AS libelle{s_id}" for s_id in range(1, len(secteur_labels) + 1)])
        join_part = " ".join([f"LEFT JOIN secteurs secteur_{s_id} ON s.ID = secteur_{s_id}.ID" for s_id in range(
            1, len(secteur_labels) + 1)])

        query = text(f"SELECT u.ID, Email, Admin, Autorisation, Demandeur, Acheteur , Editeur, {select_part} "
                     "FROM users u "
                     "LEFT JOIN r_user_secteur r_us ON r_us.user_id = u.ID "
                     "LEFT JOIN secteurs s ON s.ID = r_us.secteur_id "
                     f"{join_part} "
                     "GROUP BY u.ID, Email, Admin, Autorisation;")

        result = connection.execute(query)
        return result.fetchall()


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

def get_piece():
    with engine.connect() as connection:
        query = text(
            "SELECT ID, libelle FROM piece")
        result = connection.execute(query)
        return result.fetchall()
    
def get_articles_by_secteur(piece_libelle):
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS 'quantite_{libelle}'" for libelle in secteur_labels])

        query = text(f"SELECT c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement,  "
              "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              f"c.dateDemande, c.dateCommande, {select_part} "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (p.libelle like :piece_libelle or :piece_libelle='%') "
              "AND (c.dateDemande IS NULL OR (c.dateDemande IS NOT NULL AND c.dateCommande IS NULL) OR (c.dateDemande IS NOT NULL AND c.dateCommande < c.dateDemande)) "
              "AND a.dateFinValidite > NOW() "
              "GROUP BY c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateCommande, c.dateDemande "
              "ORDER BY a.ID DESC ")

        result = connection.execute(
            query, {"piece_libelle": piece_libelle})

        return result.fetchall()

def get_articles_to_receve(piece_libelle):
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS 'quantite_{libelle}'" for libelle in secteur_labels])

        query = text(f"SELECT c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement,  "
              "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              f"c.dateDemande, c.dateCommande, c.dateReception, c.enTotalite , {select_part} "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (p.libelle like :piece_libelle or :piece_libelle='%') "
              "AND ((c.dateDemande and c.dateCommande) IS NOT NULL) "
              "AND (((c.enTotalite IS NULL or c.enTotalite = 0) or ((c.dateReception and c.enTotalite) IS NULL)) or (c.dateReception < c.dateCommande)) "
              "GROUP BY c.ID, a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateCommande, c.dateDemande, c.dateReception, c.enTotalite  "
              "ORDER BY a.ID DESC ")

        result = connection.execute(
            query, {"piece_libelle": piece_libelle})
        
        return result.fetchall()

        
def get_articles_to_buy():
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS 'quantite_{libelle}'" for libelle in secteur_labels])

        query = text(f"SELECT DISTINCT c.ID, a.ID, a.libelle , a.ref, f.libelle, a.conditionnement, "
              f"(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              "c.dateDemande , c.dateCommande, "    
              f"{select_part} "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (c.dateDemande > c.dateCommande OR c.dateCommande IS NULL) "
              "AND c.dateDemande IS NOT NULL "
              "GROUP BY c.ID,a.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateDemande, c.dateCommande "
              "ORDER BY a.ID DESC ")
        

        result = connection.execute(query)
        return result.fetchall()
