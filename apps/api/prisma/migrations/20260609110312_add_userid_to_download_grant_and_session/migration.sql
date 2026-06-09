-- AlterTable
ALTER TABLE "DownloadGrant" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "DownloadGrant_userId_idx" ON "DownloadGrant"("userId");

-- AddForeignKey
ALTER TABLE "DownloadGrant" ADD CONSTRAINT "DownloadGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
