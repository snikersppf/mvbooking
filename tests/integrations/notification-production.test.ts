import { NotificationChannel, NotificationType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createEmailProvider, createTelegramProvider, ResendNotificationProvider, TelegramNotificationProvider } from "@/server/integrations/notification-production";
import { bookingNotificationInput, requireNotificationOrigin } from "@/server/services/notifications/worker";

describe("production notification adapters", () => {
  const input = { recipient: "customer@example.test", message: "Booking event", subject: "Booking", idempotencyKey: "notification/event-1" };

  it("links customer email to the existing booking list rather than a nonexistent detail route", () => {
    const delivery = bookingNotificationInput({ id: "event-1", bookingId: "booking-1", type: NotificationType.BOOKING_CREATED, channel: NotificationChannel.EMAIL }, "customer@example.test", "https://booking.example");
    expect(delivery.message).toBe("Заявка на бронирование получена.\nБронь booking-1\nhttps://booking.example/account/bookings");
    expect(delivery.recipient).toBe("customer@example.test");
  });

  it("uses a stable idempotency key and plain text email with no redirects", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "email-1" }));
    const provider = new ResendNotificationProvider("test-only-key", "sender@example.test", request);
    await expect(provider.send(input)).resolves.toMatchObject({ status: "sent", messageId: "email-1" });
    expect(request).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      redirect: "error", headers: expect.objectContaining({ "Idempotency-Key": input.idempotencyKey }),
      body: JSON.stringify({ from: "sender@example.test", to: [input.recipient], subject: input.subject, text: input.message }),
    }));
  });

  it("allows email retry after transport ambiguity without exposing the cause", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error("secret-bearing request URL"));
    await expect(new ResendNotificationProvider("test-key", "sender@example.test", request).send(input))
      .rejects.toMatchObject({ message: "EMAIL_TRANSPORT_UNCERTAIN", retryable: true, ambiguous: true });
  });

  it("never automatically retries an uncertain Telegram send", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error("bot secret URL"));
    await expect(new TelegramNotificationProvider("test-only-token", request).send(input))
      .rejects.toMatchObject({ message: "TELEGRAM_TRANSPORT_UNCERTAIN", retryable: false, ambiguous: true });
  });

  it("retries explicit Telegram rate limiting and respects retry_after", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, error_code: 429, parameters: { retry_after: 90 } }, { status: 429 }));
    await expect(new TelegramNotificationProvider("test-only-token", request).send(input))
      .rejects.toMatchObject({ retryable: true, ambiguous: false, retryAfterSeconds: 90 });
  });

  it("posts only booking number and protected admin URL to Telegram, without link previews", async () => {
    const delivery = bookingNotificationInput({ id: "event-1", bookingId: "booking-1", type: NotificationType.BOOKING_CREATED, channel: NotificationChannel.TELEGRAM }, "-100123", "https://booking.example");
    expect(delivery.message).toBe("Бронь booking-1\nhttps://booking.example/admin/bookings/booking-1");
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, result: { message_id: 123 } }));
    await expect(new TelegramNotificationProvider("test-only-token", request).send(delivery)).resolves.toMatchObject({ messageId: "123" });
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({ chat_id: "-100123", text: delivery.message, link_preview_options: { is_disabled: true } });
  });

  it("fails closed for missing credentials and insecure production origin", () => {
    expect(() => createEmailProvider({})).toThrow("EMAIL_CONFIGURATION_MISSING");
    expect(() => createTelegramProvider({})).toThrow("TELEGRAM_CONFIGURATION_MISSING");
    expect(() => requireNotificationOrigin({ NODE_ENV: "production", APP_ORIGIN: "http://booking.example" })).toThrow("HTTPS");
  });
});
