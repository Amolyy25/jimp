-- Profile versioning + analytics + follows + guestbook.

-- ProfileVersion ----------------------------------------------------------
CREATE TABLE "ProfileVersion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProfileVersion_profileId_createdAt_idx" ON "ProfileVersion"("profileId", "createdAt");
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ViewEvent ---------------------------------------------------------------
CREATE TABLE "ViewEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "referer" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ViewEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ViewEvent_profileId_createdAt_idx" ON "ViewEvent"("profileId", "createdAt");
CREATE INDEX "ViewEvent_profileId_sessionId_idx" ON "ViewEvent"("profileId", "sessionId");
ALTER TABLE "ViewEvent" ADD CONSTRAINT "ViewEvent_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ClickEvent --------------------------------------------------------------
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClickEvent_profileId_createdAt_idx" ON "ClickEvent"("profileId", "createdAt");
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Follow ------------------------------------------------------------------
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "profileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Follow_followerId_followeeId_key" ON "Follow"("followerId", "followeeId");
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");
CREATE INDEX "Follow_followeeId_idx" ON "Follow"("followeeId");
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followeeId_fkey"
  FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GuestbookEntry ----------------------------------------------------------
CREATE TABLE "GuestbookEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestbookEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuestbookEntry_profileId_authorId_key" ON "GuestbookEntry"("profileId", "authorId");
CREATE INDEX "GuestbookEntry_profileId_createdAt_idx" ON "GuestbookEntry"("profileId", "createdAt");
ALTER TABLE "GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
