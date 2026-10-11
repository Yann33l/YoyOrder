CREATE TABLE "WorkspaceNews" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT 'legacy',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceNews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkspaceNews_workspaceId_published_createdAt_idx" ON "WorkspaceNews"("workspaceId", "published", "createdAt");
ALTER TABLE "WorkspaceNews" ADD CONSTRAINT "WorkspaceNews_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
