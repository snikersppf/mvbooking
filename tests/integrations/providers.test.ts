import { describe, expect, it } from "vitest";
import { MockMapProvider, type MapAddress, type MapProvider } from "@/server/integrations/map";
import {
  MockEmailNotificationProvider,
  MockNotificationProvider,
  MockSmsNotificationProvider,
  MockTelegramNotificationProvider,
  MockWhatsappNotificationProvider,
  type NotificationProvider,
} from "@/server/integrations/notification";
import { MockPaymentProvider, type PaymentProvider } from "@/server/integrations/payment";

describe("integration provider mocks", () => {
  it("creates, reads and refunds a mock payment without a gateway", async () => {
    const provider: PaymentProvider = new MockPaymentProvider();
    const created = await provider.createPayment({ bookingId: "booking-1", amount: "90.00", currency: "GEL" });
    expect(created.status).toBe("PENDING");
    await expect(provider.getPaymentStatus(created.paymentId)).resolves.toBe("PENDING");
    await provider.refundPayment(created.paymentId);
    await expect(provider.getPaymentStatus(created.paymentId)).resolves.toBe("REFUNDED");
    await expect(provider.getPaymentStatus("missing")).rejects.toThrow("not found");
  });

  it.each([
    ["email", MockEmailNotificationProvider],
    ["telegram", MockTelegramNotificationProvider],
    ["sms", MockSmsNotificationProvider],
    ["whatsapp", MockWhatsappNotificationProvider],
  ] as const)("records a %s mock notification without network I/O", async (channel, Provider) => {
    const provider = new Provider();
    const result = await provider.send({ recipient: "test", message: "booking-1" });
    expect(result).toMatchObject({ channel, status: "mock-sent" });
    expect(provider.sent).toEqual([{ recipient: "test", message: "booking-1" }]);
  });

  it("maps fixture addresses and coordinates without an external map service", async () => {
    const address: MapAddress = { label: "Tbilisi Airport", coordinates: { latitude: 41.6692, longitude: 44.9547 } };
    const provider: MapProvider = new MockMapProvider([address]);
    await expect(provider.geocode(address.label)).resolves.toEqual(address);
    await expect(provider.reverseGeocode(address.coordinates)).resolves.toEqual(address);
    await expect(provider.geocode("unknown")).resolves.toBeNull();
  });

  it("keeps a consumer dependent on contracts, not concrete providers", async () => {
    async function useProviders(payment: PaymentProvider, notification: NotificationProvider, map: MapProvider) {
      const address = await map.geocode("Tbilisi Airport");
      if (!address) throw new Error("Address missing.");
      const paymentResult = await payment.createPayment({ bookingId: "booking-1", amount: "90.00", currency: "GEL" });
      const notice = await notification.send({ recipient: "test", message: paymentResult.paymentId });
      return { latitude: address.coordinates.latitude, paymentStatus: paymentResult.status, notificationStatus: notice.status };
    }

    const address: MapAddress = { label: "Tbilisi Airport", coordinates: { latitude: 41.6692, longitude: 44.9547 } };
    const result = await useProviders(new MockPaymentProvider(), new MockNotificationProvider("email"), new MockMapProvider([address]));
    expect(result).toEqual({ latitude: 41.6692, paymentStatus: "PENDING", notificationStatus: "mock-sent" });
  });
});
