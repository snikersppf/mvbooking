ALTER TYPE "NotificationType" ADD VALUE 'LEAD_CREATED';
ALTER TABLE "Notification" ADD COLUMN "leadId" TEXT;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Notification_leadId_idx" ON "Notification"("leadId");
