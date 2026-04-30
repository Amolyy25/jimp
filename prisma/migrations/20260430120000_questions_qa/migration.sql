-- Anonymous Q&A on profiles.

DO $$ BEGIN
  CREATE TYPE "QStatus" AS ENUM ('PENDING', 'ANSWERED', 'HIDDEN', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Question" (
  "id"          TEXT PRIMARY KEY,
  "profileId"   TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "answer"      TEXT,
  "answeredAt"  TIMESTAMP(3),
  "askerHash"   TEXT NOT NULL,
  "status"      "QStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Question_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Question_profileId_status_createdAt_idx"
  ON "Question"("profileId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Question_profileId_askerHash_idx"
  ON "Question"("profileId", "askerHash");
CREATE INDEX IF NOT EXISTS "Question_profileId_createdAt_idx"
  ON "Question"("profileId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "AskerBlock" (
  "profileId"  TEXT NOT NULL,
  "askerHash"  TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("profileId", "askerHash"),
  CONSTRAINT "AskerBlock_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AskerBlock_profileId_idx" ON "AskerBlock"("profileId");
