-- Discord OAuth linkage on User.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "discordId"       TEXT,
  ADD COLUMN IF NOT EXISTS "discordUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "discordAvatar"   TEXT;

-- One Discord account ↔ one local account.
CREATE UNIQUE INDEX IF NOT EXISTS "User_discordId_key" ON "User"("discordId");

-- Local password is now optional — Discord-only users have none.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
