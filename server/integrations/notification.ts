import { randomUUID } from "node:crypto";

export type NotificationChannel = "email" | "telegram" | "sms" | "whatsapp";

export type NotificationInput = Readonly<{
  recipient: string;
  message: string;
}>;

export type NotificationResult = Readonly<{
  messageId: string;
  channel: NotificationChannel;
  status: "mock-sent";
}>;

export interface NotificationProvider {
  send(input: NotificationInput): Promise<NotificationResult>;
}

export class MockNotificationProvider implements NotificationProvider {
  readonly sent: NotificationInput[] = [];

  constructor(readonly channel: NotificationChannel) {}

  async send(input: NotificationInput): Promise<NotificationResult> {
    this.sent.push({ ...input });
    return { messageId: randomUUID(), channel: this.channel, status: "mock-sent" };
  }
}

export class MockEmailNotificationProvider extends MockNotificationProvider {
  constructor() { super("email"); }
}

export class MockTelegramNotificationProvider extends MockNotificationProvider {
  constructor() { super("telegram"); }
}

export class MockSmsNotificationProvider extends MockNotificationProvider {
  constructor() { super("sms"); }
}

export class MockWhatsappNotificationProvider extends MockNotificationProvider {
  constructor() { super("whatsapp"); }
}
