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

        query = text(f"SELECT u.ID, Email, Admin, Autorisation, Demandeur, Acheteur , {select_part} "
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
            [f"SUM(CASE WHEN s.libelle = '{libelle}' THEN c.quantite ELSE 0 END) AS quantite_{libelle}" for libelle in secteur_labels])

        query = text(f"SELECT a.ID, a.libelle AS 'nom article', a.ref, f.libelle AS fournisseur, a.conditionnement, "
              f"SUM(c.quantite) AS quantite, MAX(c.dateDemande) AS dateDemande, MAX(c.dateCommande) AS dateCommande, {select_part} "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN secteurs s ON s.ID = c.secteur_id "
              "WHERE (p.libelle like :piece_libelle or :piece_libelle='%') "
              "AND (c.dateDemande > c.dateCommande OR c.dateCommande IS NULL) "
              "GROUP BY a.ID, a.libelle, a.ref, f.libelle, a.conditionnement"
            )
        result = connection.execute(
            query, {"piece_libelle": piece_libelle})
        return result.fetchall()

        
def get_articles_to_buy():
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs;")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]
        print(secteur_labels)

        select_part = ", ".join(
            [f"SUM(CASE WHEN s.libelle = '{libelle}' THEN c.quantite ELSE 0 END) AS quantite_{libelle}" for libelle in secteur_labels])

        query = text(f"SELECT a.ID, a.libelle AS 'nom article', a.ref, f.libelle AS fournisseur, a.conditionnement, "
              f"SUM(c.quantite) AS quantite, MAX(c.dateDemande) AS dateDemande, MAX(c.dateCommande) AS dateCommande, {select_part} "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN secteurs s ON s.ID = c.secteur_id "
              "WHERE c.dateDemande > c.dateCommande OR c.dateCommande IS NULL "
              "GROUP BY a.ID, a.libelle, a.ref, f.libelle, a.conditionnement")
               
        result = connection.execute(query)
        return result.fetchall()