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
            "AND c_sub.dateCommande IS NOT NULL "
            "AND r_sub.sous_commande_id IS NULL "
             "AND (c_sub.enTotalite is null or c_sub.enTotalite = 0)) ")

        select_part = ", ".join(
            [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite ELSE 0 END) AS quantite_{libelle}" for libelle in secteur_labels])

        query = text(f"SELECT a.ID, c.ID, a.libelle, a.ref, f.libelle, a.conditionnement, "
              f"{quantite_demande}-{quantite_recu} as quantite_en_attente, "
              "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
              f"c.dateDemande, {select_part}, a.commentaire "

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
        
        quantite_demande = text("(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID) ")

        quantite_recu = text("(SELECT SUM(COALESCE(r_sub.quantite, 0)) as quantite_recu "
             "FROM commandes c_sub "
             "LEFT JOIN receptions r_sub ON r_sub.commande_id = c_sub.ID "
             "WHERE c_sub.article_id = a.ID "
             "AND c_sub.id = c.ID  "
             "AND r_sub.sous_commande_id IS NULL "
             "AND (c_sub.enTotalite is null or c_sub.enTotalite = 0)) ")
        
        query = text(f"SELECT distinct a.ID,NULL, c.ID,NULL, r.ID, sk.ID, a.libelle,NULL, a.ref, f.libelle, a.conditionnement,  "
              f"{quantite_demande}, {quantite_demande}-{quantite_recu} as quantite_en_attente , r.quantite, "
              f"c.dateDemande, c.dateCommande, max(r.dateReception), sk.lot, sk.datePeremption, CASE WHEN sk.COA IS NOT NULL THEN sk.ID ELSE NULL END, c.enTotalite,{select_part}, c.commentaireDemandeur, c.commentaire, r.commentaire "
              "FROM articles a "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
              "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
              "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
              "LEFT JOIN commandes c ON c.article_id = a.ID "
              "LEFT JOIN receptions r ON r.commande_id = c.ID "
              "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
              "LEFT JOIN r_reception_stock r_rs ON r.ID = r_rs.reception_id "
              "LEFT JOIN stocks sk ON r_rs.stock_id = sk.ID "
              "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
              "WHERE (p.libelle like :piece_libelle or :piece_libelle='%') "
              "AND r.sous_commande_id IS NULL "
              "AND ((c.dateDemande and c.dateCommande) IS NOT NULL) "
              "AND (c.commentaire IS not NULL) "
              "AND (r.dateReception IS NULL OR r.dateReception = (SELECT MAX(r_sub.dateReception) FROM receptions r_sub WHERE r_sub.sous_commande_id is NULL and  r_sub.commande_id = c.ID)) "
              "AND (((c.enTotalite IS NULL OR c.enTotalite = 0) OR ((r.dateReception AND c.enTotalite) IS NULL)) OR (r.dateReception < c.dateCommande)) "
              "GROUP BY c.ID, a.ID,sk.ID, a.libelle, a.ref, f.libelle, a.conditionnement, c.dateCommande, c.dateDemande, sk.lot, sk.datePeremption, c.enTotalite, c.commentaireDemandeur, r.commentaire, r.ID , r.quantite  "
)

        result = connection.execute(
            query, {"piece_libelle": piece_libelle})
        
        return result.fetchall()

def get_sous_articles_to_receve(piece_libelle):
    with engine.connect() as connection:
        secteur_labels = connection.execute(
            text("SELECT DISTINCT libelle FROM secteurs WHERE dateFinValidite >= NOW() ORDER BY libelle; ")).fetchall()
        secteur_labels = [libelle[0] for libelle in secteur_labels]

        quantite_recu = text("(SELECT SUM(COALESCE(r_sub.quantite, 0)) "
                            "FROM sous_commandes s_c_sub "
                            "LEFT JOIN receptions r_sub ON r_sub.sous_commande_id = s_c_sub.ID "
                            "WHERE s_c_sub.sous_article_id = s_a.ID "
                            "AND s_c_sub.id = s_c.ID "
                            "AND c.ID = s_c_sub.commande_id)")
        
        select_part = ", ".join(
                    [f"SUM(DISTINCT CASE WHEN s.libelle = '{libelle}' THEN r_sc.quantite * r_s_a.quantite ELSE 0 END) AS quantite_{libelle}" for libelle in secteur_labels])



        query = text(f"SELECT DISTINCT a.ID, s_a.ID, c.ID, s_c.ID, r.ID, sk.ID, a.libelle, s_a.libelle, s_a.ref, f.libelle, s_a.conditionnement, "
                     f"s_c.quantite, s_c.quantite-{quantite_recu}  as quantite_en_attente, r.quantite, "
                     f"c.dateDemande, c.dateCommande, max(r.dateReception), sk.lot, sk.datePeremption, CASE WHEN sk.COA IS NOT NULL THEN sk.ID ELSE NULL END, s_c.enTotalite, {select_part}, c.commentaireDemandeur, c.commentaire, r.commentaire "
                     "FROM sous_articles s_a "
                     "LEFT JOIN r_articles_sous_articles r_s_a ON r_s_a.sous_article_id = s_a.ID "
                     "LEFT JOIN sous_commandes s_c ON s_c.sous_article_id = s_a.ID "
                     "LEFT JOIN commandes c ON c.ID = s_c.commande_id "
                     "LEFT JOIN articles a ON a.ID = c.article_id " 
                     "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
                     "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
                     "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
                     "LEFT JOIN receptions r ON r.sous_commande_id = s_c.ID "
                     "LEFT JOIN r_reception_stock r_rs ON r.ID = r_rs.reception_id "
                     "LEFT JOIN stocks sk ON r_rs.stock_id = sk.ID "
                     "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
                     "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
                     "WHERE (p.libelle LIKE :piece_libelle OR :piece_libelle = '%') "
                     "AND r_s_a.article_id = a.ID "
                     "AND s_c.commande_id IS NOT NULL "
                     "AND ((c.dateDemande AND c.dateCommande) IS NOT NULL) "
                     "AND (c.commentaire IS NOT NULL) "
                     "AND (r.dateReception IS NULL OR r.dateReception = (SELECT MAX(dateReception) FROM receptions WHERE sous_commande_id = s_c.ID)) "
                     "AND (((s_c.enTotalite IS NULL OR s_c.enTotalite = 0) OR ((r.dateReception AND s_c.enTotalite) IS NULL)) OR (r.dateReception < c.dateCommande)) "
                     "GROUP BY a.ID,s_c.ID,c.ID, s_a.ID, sk.ID, s_a.libelle,a.libelle, s_a.ref, f.libelle, s_a.conditionnement, c.dateCommande, c.dateDemande, sk.lot, sk.datePeremption, s_c.enTotalite, c.commentaireDemandeur,c.commentaire, r.commentaire, r.ID, r.quantite  "
)

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

        query = text(
            "SELECT a.ID, s_a.ID, c.ID, s_c.ID, r.ID, sk.ID, a.libelle, a.ref, a.conditionnement, s_a.libelle, s_a.ref, s_a.conditionnement, f.libelle, "
            "(SELECT SUM(r_sc_sub.quantite) FROM r_secteur_commande r_sc_sub WHERE r_sc_sub.commande_id = c.ID), "
            "case WHEN s_c.quantite IS NOT NULL THEN s_c.quantite ELSE '' end, r.quantite, c.dateDemande, c.dateCommande, max(r.dateReception), sk.lot, sk.datePeremption,CASE WHEN sk.COA IS NOT NULL THEN sk.ID ELSE 0 END, CASE WHEN s_c.id IS NOT NULL THEN s_c.enTotalite ELSE c.enTotalite END AS enTotalite, "
             f"{select_part}, "
            "c.commentaireDemandeur, c.commentaire, r.commentaire "
            "FROM commandes c "
            "LEFT JOIN receptions r ON r.commande_id = c.ID "
            "LEFT JOIN r_reception_stock r_rs ON r.ID = r_rs.reception_id "
            "LEFT JOIN stocks sk ON r_rs.stock_id = sk.ID "
            "LEFT JOIN sous_commandes s_c on s_c.id = r.sous_commande_id "
            "LEFT JOIN articles a ON c.article_id = a.ID "
            "LEFT JOIN sous_articles s_a ON s_a.ID = s_c.sous_article_id "
            "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "
            "LEFT JOIN r_secteur_commande r_sc ON r_sc.commande_id = c.ID "
            "LEFT JOIN secteurs s ON s.ID = r_sc.secteur_id "
           " WHERE (c.dateDemande IS NOT NULL OR c.dateCommande IS NOT NULL OR c.commentaire IS NOT NULL) "
           " GROUP BY a.ID, s_a.ID, c.ID, s_c.ID, r.ID, a.libelle, sk.ID, a.ref, a.conditionnement, s_a.libelle, s_a.ref, f.libelle, s_a.conditionnement, s_c.quantite, r.quantite, c.dateDemande, c.dateCommande, s_c.enTotalite, c.commentaireDemandeur, c.commentaire, r.commentaire, sk.lot, sk.datePeremption "
            "ORDER BY c.dateDemande DESC,  a.libelle, s_a.libelle  , r.id asc "
        )
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

        query = text(f"SELECT DISTINCT a.ID, c.ID, a.libelle , a.ref, f.libelle, a.conditionnement, "
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
    
def get_sous_articles_to_edit():
    with engine.connect() as connection:
        query = text(f"SELECT a.ID, a.libelle, a.ref, f.libelle, s_a.ID, s_a.libelle ,s_a.ref ,s_a.conditionnement ,r_a_s.quantite, s_a.dateDebutValidite, s_a.dateFinValidite "
              "FROM r_articles_sous_articles r_a_s "
              "INNER join articles a ON a.ID = r_a_s.article_id "
              "INNER JOIN sous_articles s_a ON s_a.ID = r_a_s.sous_article_id "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "       
              "ORDER BY a.ID ASC ")
        
        result = connection.execute(query)
        return result.fetchall()

def get_active_sous_articles():
    with engine.connect() as connection:
        query = text(f"SELECT a.ID, a.libelle, a.ref, a.conditionnement, f.libelle, s_a.ID, s_a.libelle ,s_a.ref ,s_a.conditionnement "
              "FROM articles a "
              "LEFT join r_articles_sous_articles r_a_s ON a.ID = r_a_s.article_id "
              "LEFT JOIN sous_articles s_a ON s_a.ID = r_a_s.sous_article_id "
              "LEFT JOIN fournisseurs f ON a.fournisseur_id = f.ID "   
              "WHERE a.dateFinValidite >= NOW() and (s_a.dateFinValidite is null or s_a.dateFinValidite >= NOW()) "    
              "ORDER BY a.ID ASC ")
        
        result = connection.execute(query)
        return result.fetchall()
    
def get_stocks_par_commandeID_ou_sous_commandeID(reception):
    with engine.connect() as connection:
        query = text(
            "SELECT sk.ID, sk.lot "
            "FROM stocks sk "
            "LEFT JOIN r_reception_stock r_rs ON r_rs.stock_id = sk.ID "
            "LEFT JOIN receptions r ON r.ID = r_rs.reception_id "
            "LEFT JOIN commandes c ON c.ID = r.commande_id "
            "LEFT JOIN articles a ON a.ID = c.article_id "
            "LEFT JOIN sous_commandes s_c ON s_c.ID = r.sous_commande_id "
            "LEFT JOIN sous_articles s_a ON s_a.ID = s_c.sous_article_id "
            "WHERE "
            "CASE "
            "WHEN :sousCommandeID IS NOT NULL THEN s_c.sous_article_id = (SELECT sous_article_id FROM sous_commandes WHERE ID = :sousCommandeID) "
            "ELSE c.article_id = (SELECT article_id FROM commandes WHERE ID = :commandeID) "
            "END"
        )
        result = connection.execute(query, {"sousCommandeID": reception.sousCommandeID, "commandeID": reception.commandeID})
        return result.fetchall()

def get_stocks(piece_libelle):
    with engine.connect() as connection:
        query = text(
            "SELECT distinct sk.ID, r.ID, a.libelle, s_a.libelle, sk.lot, sk.COA, sk.datePeremption, r.dateReception, r.dateDebutUtilisation, r.dateFinUtilisation, sk.quantiteInitiale, sk.quantiteRestante, r.quantite, r.quantiteRestante "
            "FROM stocks sk "
            "LEFT JOIN r_reception_stock r_rs ON r_rs.stock_id = sk.ID "
            "LEFT JOIN receptions r ON r.ID = r_rs.reception_id "
            "LEFT JOIN commandes c ON c.ID = r.commande_id "
            "LEFT JOIN articles a ON a.ID = c.article_id "
            "LEFT JOIN sous_commandes s_c ON s_c.ID = r.sous_commande_id "
            "LEFT JOIN sous_articles s_a ON s_a.ID = s_c.sous_article_id "
            "LEFT JOIN r_articles_pieces r_ap ON r_ap.article_id = a.ID "
            "LEFT JOIN piece p ON p.ID = r_ap.piece_id "
            "WHERE (p.libelle like :piece_libelle or :piece_libelle='%')  "
            "AND (r.quantiteRestante > 0 OR r.dateDebutUtilisation IS NULL OR r.dateFinUtilisation IS NULL) "
        )
        result = connection.execute(query, {"piece_libelle": piece_libelle})
        return result.fetchall()