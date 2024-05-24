import { useForm } from "react-hook-form";
import { useState } from "react";
import Table_SousArticles from "../Tableaux/Table_SousArticles";
import { createData } from "../API/api";

const PageAjoutLigneReception = () => {
  const { register, handleSubmit } = useForm();
  const [donneesPrisesEnCompte, setDonneesPrisesEnCompte] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const onSubmit = async (data) => {
    data.articles_ids = Array.from(selectedRows);
    console.log("data", data);
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
          {...register("Quantité", {
            required: true,
            maxLength: 255,
          })}
        />
        <br />

        <p>Date de demande</p>
        <input
          className="custom-input"
          type="date"
          placeholder="Date de demande"
          {...register("demande", { required: true, maxLength: 255 })}
        />
        <p>Date de commande</p>
        <input
          className="custom-input"
          type="date"
          placeholder="Date de commande"
          {...register("commande", {
            required: false,
            maxLength: 255,
          })}
        />
        <p>Date de reception</p>
        <input
          className="custom-input"
          type="date"
          placeholder="Date de reception"
          {...register("reception", {
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
