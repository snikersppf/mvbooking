import { setTimeout as delay } from "node:timers/promises";
import { getPrismaClient } from "@/server/db/prisma";
import { requireAuthSecret } from "@/server/config/auth";
import { createEmailProvider, createTelegramProvider } from "@/server/integrations/notification-production";
import { processNextNotification, requireNotificationOrigin } from "@/server/services/notifications/worker";

async function main(): Promise<void> {
  const config = {
    appOrigin: requireNotificationOrigin(),
    authSecret: requireAuthSecret(),
    managerChatId: process.env.TELEGRAM_MANAGER_CHAT_ID ?? "",
    email: createEmailProvider(), telegram: createTelegramProvider(),
  };
  const prisma = getPrismaClient();
  let stopping = false;
  process.once("SIGTERM", () => { stopping = true; });
  process.once("SIGINT", () => { stopping = true; });
  try {
    while (!stopping) {
      const processed = await processNextNotification(prisma, config);
      // Resend default account quota is small: cap each worker at one send/second.
      await delay(processed ? 1_000 : 5_000);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Never log raw DB/network errors or provider URLs/response bodies.
  console.error("Notification worker stopped; inspect configuration, database and delivery status.");
  process.exitCode = 1;
});
