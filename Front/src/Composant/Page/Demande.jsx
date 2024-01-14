import TableArticlesDemande from "../Tableaux/Table_ArticleDemande";
import TableArticlesDemandeTous from "../Tableaux/Table_ArticleDemandeTousArticles";
import TableArticlesReceptionTous from "../Tableaux/Table_ArticleReceptionTousArticles";

const mainSubContentDemande = (subContent, pieces) => {
  const selectedPiece = pieces.find((piece) => piece.libelle === subContent);

  if (selectedPiece) {
    return (
      <div>
        <p>ici c&#39;est la {selectedPiece.libelle}</p>
        <TableArticlesDemande pieces={selectedPiece.libelle} />
      </div>
    );
  } else {
    return (
      <div>
        <p>ici c&#39;est Tout</p>
        <TableArticlesDemandeTous />
        <br />
        <p>ici c&#39;est la réception de Tout</p>
        <TableArticlesReceptionTous />
      </div>
    );
  }
};

export default mainSubContentDemande;
