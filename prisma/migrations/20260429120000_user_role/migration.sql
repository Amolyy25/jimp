-- Role-based access control on User.

-- Role enum -------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add column with default so existing rows are backfilled to USER.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';
