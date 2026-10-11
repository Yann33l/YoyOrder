# Administration SaaS de YoyOrder

Chaque entreprise dispose d’un espace de travail séparé. Les référentiels, rôles, utilisateurs, demandes, commandes, réceptions, stocks, certificats, actualités et tickets sont rattachés à cet espace. Les contrôles sont appliqués par le serveur, y compris lorsque le client transmet l’identifiant d’un objet d’une autre entreprise.

## Administrateurs

L’administrateur d’entreprise gère les rôles, les utilisateurs et les actualités de son espace. Il peut activer un compte et renseigner une date de fin de validité : le compte devient inaccessible après cette date, sans supprimer son historique. Dans un rôle, « Tout » sélectionne ou désélectionne tous les secteurs ou pièces actuellement disponibles. Les nouveaux secteurs et pièces doivent ensuite être ajoutés aux rôles concernés.

Le super administrateur accède à `/admin/plans`, `/admin/workspaces` et `/admin/tickets`. Il peut créer une entreprise avec son premier administrateur, suspendre un espace et sélectionner l’espace qu’il souhaite administrer. La publication des actualités nécessite aussi le statut d’administrateur de l’entreprise ; le statut de super administrateur seul ne donne pas ce droit.

La migration conserve les données existantes dans « Entreprise historique » et promeut le premier administrateur actif existant en super administrateur. Pour les futures inscriptions, les adresses configurées dans `ADMIN_EMAILS` reçoivent ce statut. Cette variable doit rester limitée aux responsables de la plateforme.

## Plans et facturation

Les plans publiés apparaissent sur `/pricing`. Les seuls quotas sont les utilisateurs actifs et le stockage des certificats. Les comptes désactivés ou arrivés en fin de validité ne consomment pas de place ; les certificats des anciens lots continuent de compter dans le stockage. Aucun quota d’articles n’est appliqué. Les activations et réceptions sont protégées contre les dépassements concurrents.

Le plan gratuit initial comporte 5 utilisateurs et 250 Mo. Ces valeurs sont modifiables par le super administrateur. L’entreprise historique n’a pas de plan attribué lors de la migration afin de préserver ses accès. Un plan payant attribué manuellement par le super administrateur est autorisé sans paiement Stripe jusqu’à sa mise en facturation.

Pour les paiements, configurer les clés Stripe et la signature du webhook côté serveur. Créer un tarif Stripe mensuel en euros correspondant au prix exact du plan, puis renseigner son identifiant `price_...`. Un tarif payant déjà enregistré conserve son prix et son identifiant Stripe : créer une nouvelle offre pour changer de prix.

Le webhook doit recevoir `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` et `invoice.paid`. Le serveur vérifie la signature, rattache l’abonnement à l’entreprise et valide le tarif. Les abonnements inactifs ou impayés bloquent l’accès métier ; la page Tarifs reste accessible pour régulariser la situation. Le portail Stripe permet de gérer un abonnement existant.

Les anciennes actions de paiement et de téléversement de la démo sont désactivées. Les certificats sont ajoutés depuis les réceptions, où le quota de stockage est contrôlé.

## Assistance, actualités et versions

Les utilisateurs créent et suivent leurs tickets sur `/tickets`. L’administrateur voit les tickets de son entreprise. Le super administrateur dispose du suivi global, des statuts, priorités et exports JSON/JSONL. Les conversations d’une autre entreprise sont inaccessibles aux utilisateurs ordinaires.

Les actualités apparaissent sur l’accueil métier `/inventory`. L’administrateur peut créer et modifier un brouillon, puis le publier ou retirer sa publication. Les utilisateurs voient uniquement les actualités publiées de leur entreprise.

Le numéro de version en pied de page ouvre `/versions`. Le journal et la version courante sont maintenus dans `app/src/client/versions.ts`, en ajoutant chaque nouvelle version au début de la liste. Le journal commence à la version 0.1.0 du 11 octobre 2026.

## Vérification locale

Depuis WSL, les tests unitaires utilisent `npx --no-install vitest run --config vitest.config.ts` dans `app`. Les tests PostgreSQL nécessitent `SAAS_INTEGRATION_TEST=true` et sont réservés à la base locale `yoyorder_wsl_test`. Ils créent deux entreprises temporaires et nettoient leurs données après vérification de l’isolation, des quotas, des tickets et des actualités.
