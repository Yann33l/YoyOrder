import { app, page, route } from "@wasp.sh/spec";

import { App } from "./src/client/App" with { type: "ref" };
import { NotFoundPage } from "./src/client/components/NotFoundPage" with { type: "ref" };
import { serverEnvValidationSchema } from "./src/env" with { type: "ref" };
import { LandingPage } from "./src/landing-page/LandingPage" with { type: "ref" };
import { VersionsPage } from "./src/client/VersionsPage" with { type: "ref" };

import { adminSpec } from "./src/admin/admin.wasp";
import { analyticsSpec } from "./src/analytics/analytics.wasp";
import { authConfig, authSpec } from "./src/auth/auth.wasp";
import { head } from "./src/client/head.wasp";
import { fileUploadSpec } from "./src/file-upload/file-upload.wasp";
import { paymentSpec } from "./src/payment/payment.wasp";
import { emailSender } from "./src/server/emailSender.wasp";
import { userSpec } from "./src/user/user.wasp";
import { inventorySpec } from "./src/inventory/inventory.wasp";
import { saasSpec } from "./src/saas/saas.wasp";

export default app({
  name: "YoyOrder",
  wasp: { version: "^0.25.0" },
  title: "YoyOrder",
  head,
  auth: authConfig,
  client: {
    rootComponent: App,
  },
  server: {
    envValidationSchema: serverEnvValidationSchema,
  },
  emailSender,
  spec: [
    // Prerendering routes with static content creates HTML files at build time that are served immediately,
    // improving SEO, search engine/AI crawling, and performance: https://wasp.sh/docs/advanced/prerendering
    route("LandingPageRoute", "/", page(LandingPage), { prerender: true }),
    route("VersionsRoute", "/versions", page(VersionsPage)),
    route("NotFoundRoute", "*", page(NotFoundPage)),
    authSpec,
    userSpec,
    inventorySpec,
    saasSpec,
    paymentSpec,
    fileUploadSpec,
    analyticsSpec,
    adminSpec,
  ],
});
