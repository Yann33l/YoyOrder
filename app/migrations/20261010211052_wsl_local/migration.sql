-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AccessRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isRequester" BOOLEAN NOT NULL DEFAULT false,
    "isBuyer" BOOLEAN NOT NULL DEFAULT false,
    "isEditor" BOOLEAN NOT NULL DEFAULT false,
    "sectorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "pieceIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_name_key" ON "AccessRole"("name");
