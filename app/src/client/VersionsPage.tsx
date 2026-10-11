import { currentVersion, releases } from "./versions";

export function VersionsPage() {
  return <main className="mx-auto max-w-4xl space-y-6 px-3 py-8">
    <header><h1 className="text-2xl font-semibold">Historique des versions</h1><p className="text-muted-foreground mt-2 text-sm">Version actuelle : {currentVersion}</p></header>
    {releases.map((release) => <article key={release.version} className="rounded-lg border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Version {release.version}</h2><time className="text-muted-foreground text-sm" dateTime={release.date}>{new Date(`${release.date}T12:00:00`).toLocaleDateString("fr-FR")}</time></div>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{release.changes.map((change) => <li key={change}>{change}</li>)}</ul>
    </article>)}
  </main>;
}
