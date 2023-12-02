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
            # ou row[0] en fonction de la structure de vos résultats
            return row.ID
        else:
            return None
