# YoyOrder application

This directory is the Open SaaS application powered by Wasp, React, Node.js, Prisma, and PostgreSQL. The inventory models are in `schema.prisma`; app routes and operations are under `src/`. The Wasp inventory area supports requests, purchase dates/numbers, partial receipts, lot quantities, certificate upload/download, basic catalog creation, and user role/sector assignment.

On Windows, use WSL for Wasp commands. From this directory, follow the [Open SaaS getting started guide](https://docs.opensaas.sh/start/getting-started/): install dependencies, copy `.env.server.example` to `.env.server`, start the local PostgreSQL service, run the Prisma migration, and start the app.

Set `ADMIN_EMAILS` to the initial administrator's email before registering that account. Local email verification links are printed by the development email provider. Production requires a configured email provider.

The YoyOrder domain model and migration status are documented in [`../docs/migration-open-saas.md`](../docs/migration-open-saas.md).
