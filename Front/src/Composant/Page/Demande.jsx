import TableArticlesDemande from "../Tableaux/Table_ArticleDemande";

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
    return null;
  }
};

export default mainSubContentDemande;
