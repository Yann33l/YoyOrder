import TableArticlesDemande from "../Tableaux/Table_ArticleDemande";
import TableArticlesDemandeTous from "../Tableaux/Table_ArticleDemandeTousArticles";

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
      </div>
    );
  }
};

export default mainSubContentDemande;
