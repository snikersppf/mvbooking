import { z } from "zod";
import type { NotificationInput, NotificationProvider, NotificationResult } from "./notification";

// Never retain provider response bodies or fetch errors: Telegram URLs contain tokens.
export class NotificationDeliveryError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    readonly ambiguous = false,
    readonly retryAfterSeconds = 0,
  ) {
    super(code);
    this.name = "NotificationDeliveryError";
  }
}

type Fetch = typeof fetch;
const telegramResponse = z.object({
  ok: z.boolean(),
  result: z.object({ message_id: z.number() }).optional(),
  error_code: z.number().optional(),
  parameters: z.object({ retry_after: z.number().nonnegative().optional() }).optional(),
});

export class ResendNotificationProvider implements NotificationProvider {
  constructor(private readonly apiKey: string, private readonly from: string, private readonly request: Fetch = fetch, private readonly timeoutMs = 15_000) {}

  async send(input: NotificationInput): Promise<NotificationResult> {
    if (!input.idempotencyKey) throw new NotificationDeliveryError("EMAIL_IDEMPOTENCY_REQUIRED", false);
    let response: Response;
    try {
      response = await this.request("https://api.resend.com/emails", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({ from: this.from, to: [input.recipient], subject: input.subject ?? "MVBooking", text: input.message }),
      });
    } catch {
      throw new NotificationDeliveryError("EMAIL_TRANSPORT_UNCERTAIN", true, true);
    }
    if (!response.ok) {
      throw new NotificationDeliveryError(`EMAIL_HTTP_${response.status}`, response.status === 429 || response.status >= 500);
    }
    const result = z.object({ id: z.string().min(1) }).safeParse(await response.json().catch(() => null));
    if (!result.success) throw new NotificationDeliveryError("EMAIL_RESPONSE_UNCERTAIN", true, true);
    return { channel: "email", messageId: result.data.id, status: "sent" };
  }
}

export class TelegramNotificationProvider implements NotificationProvider {
  constructor(private readonly token: string, private readonly request: Fetch = fetch) {}

  async send(input: NotificationInput): Promise<NotificationResult> {
    let response: Response;
    try {
      response = await this.request(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: input.recipient, text: input.message, link_preview_options: { is_disabled: true } }),
      });
    } catch {
      throw new NotificationDeliveryError("TELEGRAM_TRANSPORT_UNCERTAIN", false, true);
    }
    const result = telegramResponse.safeParse(await response.json().catch(() => null));
    if (response.ok && result.success && result.data.ok && result.data.result) {
      return { channel: "telegram", messageId: String(result.data.result.message_id), status: "sent" };
    }
    if (result.success && !result.data.ok && result.data.error_code === 429) {
      throw new NotificationDeliveryError("TELEGRAM_RATE_LIMIT", true, false, result.data.parameters?.retry_after ?? 60);
    }
    // 5xx/invalid responses can follow a successful send. Telegram has no idempotency key.
    throw new NotificationDeliveryError("TELEGRAM_DELIVERY_FAILED", false, response.status >= 500 || !result.success);
  }
}

export function createEmailProvider(env: Readonly<Record<string, string | undefined>> = process.env, timeoutMs = 15_000): NotificationProvider {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from || !z.email().safeParse(from).success) {
    throw new NotificationDeliveryError("EMAIL_CONFIGURATION_MISSING", false);
  }
  return new ResendNotificationProvider(apiKey, from, fetch, timeoutMs);
}

export function createTelegramProvider(env: Readonly<Record<string, string | undefined>> = process.env): NotificationProvider {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token) || !/^-?\d+$/.test(env.TELEGRAM_MANAGER_CHAT_ID ?? "")) {
    throw new NotificationDeliveryError("TELEGRAM_CONFIGURATION_MISSING", false);
  }
  return new TelegramNotificationProvider(token);
}
