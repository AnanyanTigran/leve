-- Add userId to GenerationJob for cross-session history queries
ALTER TABLE "GenerationJob" ADD COLUMN "userId" TEXT;

ALTER TABLE "GenerationJob"
  ADD CONSTRAINT "GenerationJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "GenerationJob_userId_idx" ON "GenerationJob"("userId");
