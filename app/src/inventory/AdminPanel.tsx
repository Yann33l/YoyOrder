import { useState, type FormEvent } from "react";
import { getAccessAdministration, saveAccessRole, saveManagedUser, createManagedUser, useAction, useQuery } from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../client/components/ui/dialog";
import { InventoryGrid, type GridColumn } from "./InventoryGrid";
import { toast } from "../client/hooks/use-toast";

type Data = Awaited<ReturnType<typeof getAccessAdministration>>;
type Role = Data["roles"][number]; type Account = Data["users"][number];
function Checks({ title, name, options, selected }: { title: string; name: string; options: { id: number; label: string }[]; selected: number[] }) {
  const [checked, setChecked] = useState(selected);
  const all = options.length > 0 && options.every((item) => checked.includes(item.id));
  return <fieldset className="space-y-2"><legend className="text-sm font-medium">{title}</legend><div className="max-h-48 space-y-2 overflow-auto rounded border p-3">
    {name !== "roleIds" && <label className="mb-2 flex gap-2 border-b pb-2 text-sm font-medium"><input type="checkbox" checked={all} disabled={!options.length} aria-label={`Tout sélectionner : ${title}`} ref={(input) => { if (input) input.indeterminate = !all && checked.length > 0; }} onChange={(event) => setChecked(event.target.checked ? options.map((item) => item.id) : [])} />Tout</label>}
    {options.map((item) => <label key={item.id} className="flex gap-2 text-sm"><input type="checkbox" name={name} value={item.id} checked={checked.includes(item.id)} onChange={(event) => setChecked(event.target.checked ? [...checked, item.id] : checked.filter((id) => id !== item.id))} />{item.label}</label>)}{!options.length && <p className="text-muted-foreground text-sm">Aucun élément disponible.</p>}</div></fieldset>;
}
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
const expired = (account: Account) => Boolean(account.validUntil && new Date(account.validUntil).toISOString().slice(0, 10) < today());
export function AdminPanel({ actorId, section: tab, onChanged }: { actorId: string; section: "users" | "roles"; onChanged: () => Promise<unknown> }) {
  const { data, isLoading, error, refetch } = useQuery(getAccessAdministration, {});
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<{ kind: "role"; role?: Role } | { kind: "user"; user?: Account } | null>(null);
  const [saving, setSaving] = useState(false);
  const [verificationLink, setVerificationLink] = useState("");
  const saveRole = useAction(saveAccessRole), saveUser = useAction(saveManagedUser), createUser = useAction(createManagedUser);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!edit) return;
    const values = new FormData(event.currentTarget);
    const ids = (name: string) => values.getAll(name).map(Number);
    setSaving(true);
    try {
      if (edit.kind === "role") await saveRole({ id: edit.role?.id, name: String(values.get("name")), isRequester: values.has("isRequester"), isBuyer: values.has("isBuyer"), isEditor: values.has("isEditor"), sectorIds: ids("sectorIds"), pieceIds: ids("pieceIds") });
      else {
        const account = { isAdmin: values.has("isAdmin"), isAuthorized: values.has("isAuthorized"), validUntil: String(values.get("validUntil") || "") || null, roleIds: ids("roleIds") };
        if (edit.user) await saveUser({ ...account, userId: edit.user.id });
        else { const created = await createUser({ ...account, email: String(values.get("email")), password: String(values.get("password")) }); setVerificationLink(created.verificationLink); }
      }
      const ownAccount = edit.kind === "user" && edit.user?.id === actorId;
      setEdit(null); await refetch(); await onChanged();
      toast({ title: "Administration enregistrée" });
      if (ownAccount) window.location.reload();
    } catch (error) { toast({ title: "Enregistrement impossible", description: error instanceof Error ? error.message : "Vérifiez les champs.", variant: "destructive" }); }
    finally { setSaving(false); }
  }
  if (isLoading) return <p>Chargement de l’administration…</p>;
  if (error || !data) return <p className="text-destructive">Impossible de charger l’administration.</p>;
  const labels = (ids: number[], options: { id: number; label: string }[]) => options.filter((item) => ids.includes(item.id)).map((item) => item.label).join(", ");
  const roleOptions = data.roles.map((role) => ({ id: role.id, label: role.name }));
  const userColumns: GridColumn<Account>[] = [
    { id: "email", label: "Email", width: 260, value: (account) => account.email },
    { id: "admin", label: "Administrateur", value: (account) => account.isAdmin ? "Oui" : "Non" },
    { id: "roles", label: "Rôles", width: 240, value: (account) => account.roleIds.length ? labels(account.roleIds, roleOptions) : `Accès existants : ${[account.isRequester && "Demandeur", account.isBuyer && "Acheteur", account.isEditor && "Éditeur"].filter(Boolean).join(", ") || "aucun"}` },
    { id: "status", label: "Statut", value: (account) => expired(account) ? "Archivé" : account.isAuthorized ? "Actif" : "Inactif" },
    { id: "createdAt", label: "Créé le", value: (account) => new Date(account.createdAt).toLocaleDateString("fr-FR") },
    { id: "validUntil", label: "Fin de validité", value: (account) => account.validUntil ? new Date(account.validUntil).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "Sans limite" },
    { id: "edit", label: "Actions", value: () => "", render: (account) => <Button size="sm" variant="outline" disabled={saving} onClick={() => setEdit({ kind: "user", user: account })}>Modifier</Button> },
  ];
  const roleColumns: GridColumn<Role>[] = [
    { id: "name", label: "Rôle", width: 240, value: (role) => role.name },
    { id: "permissions", label: "Permissions", width: 260, value: (role) => [role.isRequester && "Demander / réceptionner", role.isBuyer && "Commander", role.isEditor && "Gérer les référentiels"].filter(Boolean).join(", ") },
    { id: "sectors", label: "Secteurs visibles", width: 260, value: (role) => labels(role.sectorIds, data.sectors) || "Aucun" },
    { id: "pieces", label: "Pièces visibles", width: 260, value: (role) => labels(role.pieceIds, data.pieces) || "Aucune" },
    { id: "edit", label: "Actions", value: () => "", render: (role) => <Button size="sm" variant="outline" disabled={saving} onClick={() => setEdit({ kind: "role", role })}>Modifier</Button> },
  ];
  const users = data.users.filter((account) => filter === "all" || (filter === "archived" ? expired(account) : filter === "active" ? !expired(account) && account.isAuthorized : !expired(account) && !account.isAuthorized));
  return <section className="space-y-4">
    <div className="flex justify-end"><Button disabled={saving} onClick={() => setEdit({ kind: tab === "users" ? "user" : "role" })}>{tab === "users" ? "Ajouter un utilisateur" : "Créer un rôle"}</Button></div>
    {tab === "roles" ? <><p className="text-muted-foreground text-sm">Chaque rôle définit les actions et les pièces et secteurs visibles. Plusieurs rôles cumulent leurs permissions et leurs visibilités. Une liste vide ne donne aucune visibilité. L’administrateur conserve la visibilité complète.</p><InventoryGrid label="Rôles" rows={data.roles} columns={roleColumns} rowId={(role) => role.id} /></> : <><label className="flex items-center gap-3 text-sm">Comptes<select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 rounded border bg-background px-3"><option value="all">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs / en attente</option><option value="archived">Archivés</option></select></label><p className="text-muted-foreground text-sm">La fin de validité est incluse. Le lendemain, l’accès est bloqué et le compte apparaît dans les archives, avec ses données conservées.</p><InventoryGrid label="Utilisateurs" rows={users} columns={userColumns} rowId={(account) => account.id} /></>}
    {verificationLink && <div className="space-y-2 rounded border p-4"><p className="font-medium">Compte créé — lien de vérification de l’email</p><p className="text-sm text-muted-foreground">À transmettre à l’utilisateur avec son mot de passe initial. Le lien est valable 30 minutes. Aucun email n’est envoyé automatiquement.</p><Input aria-label="Lien de vérification" readOnly value={verificationLink} onFocus={(event) => event.target.select()} /><Button size="sm" variant="outline" onClick={() => setVerificationLink("")}>Masquer le lien</Button></div>}
    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open && !saving) setEdit(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{edit?.kind === "role" ? edit.role ? "Modifier le rôle" : "Créer un rôle" : edit?.user ? `Modifier ${edit.user.email}` : "Ajouter un utilisateur"}</DialogTitle></DialogHeader>{edit && <form className="space-y-4" onSubmit={submit}>
      {edit.kind === "role" ? <><label className="block space-y-1 text-sm">Nom du rôle<Input name="name" defaultValue={edit.role?.name} maxLength={120} required /></label><fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Permissions</legend>{([ ["isRequester", "Demander, réceptionner et gérer le stock"], ["isBuyer", "Passer des commandes"], ["isEditor", "Gérer les référentiels"] ] as const).map(([name, label]) => <label key={name} className="flex gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={edit.role?.[name]} />{label}</label>)}</fieldset><Checks title="Secteurs visibles" name="sectorIds" options={data.sectors} selected={edit.role?.sectorIds ?? []} /><Checks title="Pièces visibles" name="pieceIds" options={data.pieces} selected={edit.role?.pieceIds ?? []} /></> : <>
        {!edit.user && <><label className="block space-y-1 text-sm">Email<Input name="email" type="email" required /></label><label className="block space-y-1 text-sm">Mot de passe initial (12 caractères minimum)<Input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label></>}
        <label className="flex gap-2 text-sm"><input type="checkbox" name="isAdmin" defaultChecked={edit.user?.isAdmin ?? false} />Administrateur de l’entreprise</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="isAuthorized" defaultChecked={edit.user?.isAuthorized ?? false} />Compte activé</label>
        <label className="block space-y-1 text-sm">Fin de validité (facultative)<Input name="validUntil" type="date" defaultValue={edit.user?.validUntil ? new Date(edit.user.validUntil).toISOString().slice(0, 10) : ""} /></label>
        <Checks title="Rôles attribués" name="roleIds" options={roleOptions} selected={edit.user?.roleIds ?? []} />
      </>}
      <Button disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>}</DialogContent></Dialog>
  </section>;
}
