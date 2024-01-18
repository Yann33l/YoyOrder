import TableArticlesDemande from "../Tableaux/Table_ArticleDemande";
import TableArticlesReception from "../Tableaux/Table_ArticleReception";

const mainSubContentDemande = (subContent, pieces) => {
  const selectedPiece = pieces.find((piece) => piece.libelle === subContent);

  if (selectedPiece) {
    return (
      <div>
        <p>ici c&#39;est la {selectedPiece.libelle}</p>
        <TableArticlesDemande pieces={selectedPiece.libelle} />
        <p>ici c&#39;est la réception </p>
        <TableArticlesReception pieces={selectedPiece.libelle} />
      </div>
    );
  } else {
    return (
      <div>
        <p>ici c&#39;est Tout</p>
        <TableArticlesDemande pieces={"Tous"} />
        <br />
        <p>ici c&#39;est la réception de Tout</p>
        <TableArticlesReception pieces={"Tous"} />
      </div>
    );
  }
};

export default mainSubContentDemande;
