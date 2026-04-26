-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Existing users were already able to sign in before this feature existed.
UPDATE "public"."User"
SET "emailVerified" = true;
