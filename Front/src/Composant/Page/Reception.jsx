import TableArticlesReception from "../Tableaux/Table_ArticleReception";

const mainSubContentReception = (subContent, pieces) => {
  const selectedPiece = pieces.find((piece) => piece.libelle === subContent);

  if (selectedPiece) {
    return (
      <div>
        <h2>{selectedPiece.libelle}</h2>
        <p>Articles à réceptionner </p>
        <TableArticlesReception pieces={selectedPiece.libelle} />
      </div>
    );
  } else {
    return (
      <div>
        <h2>Tous</h2>
        <p>Articles à réceptionner </p>
        <TableArticlesReception pieces={"Tous"} />
      </div>
    );
  }
};

export default mainSubContentReception;
