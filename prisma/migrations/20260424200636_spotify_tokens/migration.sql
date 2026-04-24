-- AlterTable
ALTER TABLE "User" ADD COLUMN     "spotifyAccessToken" TEXT,
ADD COLUMN     "spotifyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "spotifyRefreshToken" TEXT;
