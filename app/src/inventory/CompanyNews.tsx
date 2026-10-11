import { useState, type FormEvent } from "react";
import { getCompanyNews, saveCompanyNews, useQuery, useAction } from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "../client/components/ui/dialog";
import { toast } from "../client/hooks/use-toast";
type News = Awaited<ReturnType<typeof getCompanyNews>>[number];
export function CompanyNews({ canPublish }: { canPublish: boolean }) {
  const { data, error, refetch } = useQuery(getCompanyNews, {}); const save = useAction(saveCompanyNews);
  const [edit, setEdit] = useState<News | "new" | null>(null), [busy, setBusy] = useState(false), [all, setAll] = useState(false);
  const rows = (data ?? []).filter((news) => all || news.published);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true);
    try { await save({ id: edit && edit !== "new" ? edit.id : undefined, title: String(values.get("title")), body: String(values.get("body")), published: values.has("published") }); await refetch(); setEdit(null); toast({ title: "Actualité enregistrée" }); }
    catch (error) { toast({ title: "Enregistrement impossible", description: error instanceof Error ? error.message : "Réessayez", variant: "destructive" }); } finally { setBusy(false); }
  }
  return <section className="mb-6 space-y-3" aria-label="Actualités de l’entreprise"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Actualités</h2>{canPublish && <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />Voir les brouillons</label><Button size="sm" variant="outline" onClick={() => setEdit("new")}>Créer une actualité</Button></div>}</div>
    {error ? <p className="text-destructive text-sm">Impossible de charger les actualités.</p> : !rows.length ? <p className="text-muted-foreground text-sm">Aucune actualité publiée.</p> : <div className="grid gap-3 lg:grid-cols-2">{rows.map((news) => <article key={news.id} className="rounded-lg border p-4"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{news.title}{!news.published && <span className="text-muted-foreground ml-2 text-xs">Brouillon</span>}</h3><p className="text-muted-foreground mt-1 text-xs">{new Date(news.createdAt).toLocaleDateString("fr-FR")} · {news.createdByEmail}</p></div>{canPublish && <Button size="sm" variant="ghost" onClick={() => setEdit(news)}>Modifier</Button>}</div><p className="mt-3 whitespace-pre-wrap break-words text-sm">{news.body}</p></article>)}</div>}
    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open && !busy) setEdit(null); }}><DialogContent><DialogTitle>{edit === "new" ? "Créer une actualité" : "Modifier l’actualité"}</DialogTitle><form className="space-y-4" onSubmit={submit}><label className="block text-sm">Titre<Input name="title" defaultValue={edit && edit !== "new" ? edit.title : ""} required maxLength={200} /></label><label className="block text-sm">Texte<textarea className="bg-background mt-1 w-full rounded border p-3" name="body" defaultValue={edit && edit !== "new" ? edit.body : ""} rows={7} required maxLength={20000} /></label><label className="flex gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={edit && edit !== "new" ? edit.published : false} />Publier pour les utilisateurs de l’entreprise</label><Button disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button></form></DialogContent></Dialog>
  </section>;
}
