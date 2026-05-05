-- CreateTable
CREATE TABLE "DiscordPresenceCache" (
    "discordId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordPresenceCache_pkey" PRIMARY KEY ("discordId")
);
