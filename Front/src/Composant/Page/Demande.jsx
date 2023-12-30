import TableArticles from "../Tableaux/Table_Article";

const mainSubContentDemande = (subContent, pieces) => {
  const selectedPiece = pieces.find((piece) => piece.libelle === subContent);

  if (selectedPiece) {
    return (
      <div>
        <p>ici c&#39;est la {selectedPiece.libelle}</p>
        <TableArticles pieces={selectedPiece.libelle} />
      </div>
    );
  } else {
    return null;
  }
};

export default mainSubContentDemande;
