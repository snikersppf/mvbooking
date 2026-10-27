CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');
CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "vehicleId" TEXT,
  "startDate" TIMESTAMPTZ(3),
  "endDate" TIMESTAMPTZ(3),
  "comment" TEXT NOT NULL DEFAULT '',
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "managerNote" TEXT NOT NULL DEFAULT '',
  "consentVersion" TEXT NOT NULL,
  "consentAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_contact_required" CHECK (NULLIF(btrim("email"), '') IS NOT NULL OR NULLIF(btrim("phone"), '') IS NOT NULL),
  CONSTRAINT "lead_dates_valid" CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" > "startDate"),
  CONSTRAINT "Lead_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_status_updatedAt_idx" ON "Lead"("status", "updatedAt");
CREATE INDEX "Lead_vehicleId_idx" ON "Lead"("vehicleId");
