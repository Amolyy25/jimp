-- Cookie-clicker style global counter persisted per profile.
-- Lives as its own column (not inside Profile.data Json) so atomic
-- increments and ORDER BY clickerScore DESC for the leaderboard stay cheap.

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "clickerScore" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Profile_clickerScore_idx"
  ON "Profile"("clickerScore" DESC);
