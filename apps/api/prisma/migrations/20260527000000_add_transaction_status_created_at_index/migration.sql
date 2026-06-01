-- Add composite index on Transaction(status, createdAt) for efficient stale-transaction queries
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");
