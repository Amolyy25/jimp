-- Stronger anti-spam dedup for view ingest:
--   * adds an `ipHash` column on ViewEvent (sha256(ip + dailySalt))
--   * indexes (profileId, ipHash) so the dedup lookup is cheap
--
-- Privacy: we still never store the raw IP. The salt rotates every 24h, so
-- the same network can't be fingerprinted across days from these records.
-- Nullable to keep historical rows readable without a backfill.

ALTER TABLE "ViewEvent"
  ADD COLUMN IF NOT EXISTS "ipHash" TEXT;

CREATE INDEX IF NOT EXISTS "ViewEvent_profileId_ipHash_idx"
  ON "ViewEvent"("profileId", "ipHash");
