-- DropIndex
DROP INDEX "AccessRole_name_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "AccessRole" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Sector" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "SubArticle" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Reception" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "coaBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'legacy';

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "billingUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" TEXT,
    "maxUsers" INTEGER,
    "storageMb" INTEGER NOT NULL DEFAULT 250,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "SaasPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT 'legacy',
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "SaasPlan_stripePriceId_key" ON "SaasPlan"("stripePriceId");

-- CreateIndex
CREATE INDEX "SupportTicket_workspaceId_updatedAt_idx" ON "SupportTicket"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_workspaceId_name_key" ON "AccessRole"("workspaceId", "name");


-- Conservation des donnees historiques dans un espace dedie.
INSERT INTO "Workspace" ("id", "name", "enabled", "createdAt", "subscriptionStatus") VALUES ('legacy', 'Entreprise historique', true, CURRENT_TIMESTAMP, 'manual');
UPDATE "User" SET "workspaceId" = 'legacy';
UPDATE "Stock" SET "coaBytes" = COALESCE(octet_length("coa"), 0);
-- Le premier administrateur actif existant initialise l'administration SaaS.
UPDATE "User" SET "isSuperAdmin" = true WHERE "id" = (SELECT "id" FROM "User" WHERE "isAdmin" = true AND "isAuthorized" = true ORDER BY "createdAt", "id" LIMIT 1);
INSERT INTO "SaasPlan" ("id", "name", "description", "monthlyPriceCents", "maxUsers", "storageMb", "displayOrder", "published", "featured", "features") VALUES ('free', 'Decouverte', 'Pour demarrer avec votre entreprise.', 0, 5, 250, 0, true, false, ARRAY['Demandes, commandes et receptions', 'Historique et certificats', 'Roles et visibilites personnalisables']);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaasPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRole" ADD CONSTRAINT "AccessRole_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubArticle" ADD CONSTRAINT "SubArticle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

