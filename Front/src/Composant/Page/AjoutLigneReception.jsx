import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { GetSecteurs, createData } from "../API/api";
import Table_SousArticles from "../Tableaux/Table_SousArticles";

const PageAjoutLigneReception = () => {
  const { register, handleSubmit, getValues } = useForm();
  const [donneesPrisesEnCompte, setDonneesPrisesEnCompte] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [secteurs, setSecteurs] = useState([]);
  useEffect(() => {
    (async () => {
      setSecteurs(await GetSecteurs());
    })();
  }, []);

  const onSubmit = async (data) => {
    data.articles_ids = Array.from(selectedRows);
    data = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    );
    await createData(data, "ReceptionHorsCommande");
    setDonneesPrisesEnCompte(true);
    setTimeout(() => {
      setDonneesPrisesEnCompte(false);
    }, 700);
  };

  return (
    <div
      className={`creation ${donneesPrisesEnCompte ? "created" : "creation"}`}
    >
      <Table_SousArticles setSelectedRows={setSelectedRows} />
      <br />
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          className="custom-input"
          type="text"
          placeholder="Quantité "
          {...register("quantite", {
            required: true,
            maxLength: 2,
          })}
        />
        <br />
        <p>Secteur</p>
        <select
          className="custom-select"
          {...register("secteurID", { required: true })}
        >
          {secteurs.map((secteur) => (
            <option key={secteur.ID} value={secteur.ID}>
              {secteur.libelle}
            </option>
          ))}
        </select>

        <p>Date de demande</p>
        <input
          className="custom-input"
          type="date"
          placeholder="Date de demande"
          {...register("dateDemande", {
            required: true,
            validate: (value) => {
              // Si la valeur est une chaîne vide, on renvoie null
              if (value === "") {
                return null;
              }
            },
          })}
        />
        <p>Date de commande</p>
        <input
          className="custom-input"
          type="date"
          placeholder="Date de commande"
          {...register("dateCommande", {
            required: true,
            validate: (value) => {
              // Accéder à la valeur du champ "dateDemande"
              const dateDemande = getValues("dateDemande");

              // Convertir les valeurs en objets Date pour pouvoir les comparer
              const dateCommande = new Date(value);
              const dateDemandeObject = new Date(dateDemande);

              // Vérifier que la date de commande est bien supérieure à la date de demande
              if (dateCommande <= dateDemandeObject) {
                return "La date de commande doit être supérieure à la date de demande";
              }

              // Si tout est bon, on renvoie true
              return true;
            },
          })}
        />
        <p>Date de reception</p>
        <input
          className="custom-input"
          type="date"
          placeholder="Date de reception"
          {...register("dateReception", {
            required: false,
          })}
        />
        <br />
        <p>Commentaire</p>
        <input
          className="custom-input"
          type="text"
          placeholder="Commentaire"
          {...register("commentaire", {
            required: false,
            maxLength: 255,
          })}
        />
        <br />
        <br />
        <input
          className={`submit ${donneesPrisesEnCompte ? "submited" : "submit"}`}
          type="submit"
          value={`${donneesPrisesEnCompte ? "Ajouté !" : "Valider"}`}
        />
      </form>
      <br />
    </div>
  );
};

export default PageAjoutLigneReception;
