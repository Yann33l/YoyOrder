from sqlalchemy.sql.expression import text

from .database import engine


def get_users():
    with engine.connect() as connection:
        query = text("SELECT u.ID, Email, Admin, Autorisation, s.libelle, s.ID \
                        FROM users u \
                        LEFT JOIN r_user_secteur r_us on r_us.user_id = u.ID \
                        LEFT JOIN secteurs s on s.ID = r_us.secteur_id;")
        result = connection.execute(query)
        return result.fetchall()