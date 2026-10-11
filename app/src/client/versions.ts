export const releases = [
  {
    version: "0.1.0",
    date: "2026-10-11",
    changes: [
      "Espaces de travail séparés par entreprise, plans et quotas d’utilisateurs et de stockage.",
      "Administration des rôles, visibilité des pièces et secteurs, activation et fin de validité des comptes.",
      "Demandes par secteur, commandes groupées, réception depuis le tableau et historique des certificats.",
      "Tickets d’assistance et actualités publiées par l’administrateur de l’entreprise.",
      "Tableaux en pleine largeur, colonnes compactes et sélection de tous les secteurs et pièces d’un rôle.",
    ],
  },
] as const;

export const currentVersion = releases[0].version;
