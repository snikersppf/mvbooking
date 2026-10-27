import type { Notification, PrismaClient } from "@prisma/client";
import { expect, it, vi } from "vitest";
import { processNextNotification } from "@/server/services/notifications/worker";

it("acknowledges a lead stub without contacting customer email or Telegram", async () => {
  const update = vi.fn().mockResolvedValue({ status: "SENT" });
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "notification-1", type: "LEAD_CREATED" } as Notification]),
    notification: { updateMany: vi.fn(), update },
  };
  const prisma = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  const email = { send: vi.fn() }, telegram = { send: vi.fn() };
  await expect(processNextNotification(prisma, { appOrigin: "https://booking.example", managerChatId: "unused", email, telegram })).resolves.toBe(true);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    status: "SENT", payload: { provider: "stub", delivery: "mock-sent" },
  }) }));
  expect(email.send).not.toHaveBeenCalled();
  expect(telegram.send).not.toHaveBeenCalled();
});
