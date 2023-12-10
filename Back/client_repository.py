from sqlalchemy.sql.expression import text

from .database import engine


def get_users():
    with engine.connect() as connection:
        query = text("SELECT u.ID, Email, Admin, Autorisation, "
                     "MAX(CASE WHEN s.ID = 1 THEN TRUE ELSE FALSE END) AS ACP, "
                     "MAX(CASE WHEN s.ID = 2 THEN TRUE ELSE FALSE END) AS BIO, "
                     "MAX(CASE WHEN s.ID = 3 THEN TRUE ELSE FALSE END) AS GEC, "
                     "MAX(CASE WHEN s.ID = 4 THEN TRUE ELSE FALSE END) AS PAM, "
                     "MAX(CASE WHEN s.ID = 5 THEN TRUE ELSE FALSE END) AS RC "
                     "FROM users u "
                     "LEFT JOIN r_user_secteur r_us on r_us.user_id = u.ID "
                     "LEFT JOIN secteurs s on s.ID = r_us.secteur_id "
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
