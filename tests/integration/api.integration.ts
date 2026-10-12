import { randomUUID } from "node:crypto";
import {
  Prisma,
  UserRole,
  UserStatus,
  VehicleStatus,
  type User,
} from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const authState = vi.hoisted(() => ({
  session: null as null | {
    expires: string;
    user: {
      id: string;
      role: UserRole;
      sessionVersion: number;
      name: string | null;
      email: string | null;
    };
  },
  queuedSessions: [] as Array<{
    expires: string;
    user: {
      id: string;
      role: UserRole;
      sessionVersion: number;
      name: string | null;
      email: string | null;
    };
  }>,
}));

// Supply only the session boundary; the real identity guard still re-reads
// each user from PostgreSQL and validates status and sessionVersion.
vi.mock("@/server/auth/current-user", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/auth/current-user")>();

  return {
    ...actual,
    requireCurrentUser: vi.fn(async () => {
      const session =
        authState.queuedSessions.length > 0
          ? authState.queuedSessions.shift()
          : authState.session;
      return actual.requireCurrentUserFromIdentity(
        session
          ? {
              userId: session.user.id,
              sessionVersion: session.user.sessionVersion,
            }
          : null,
      );
    }),
  };
});

import { GET as getAvailability } from "@/app/api/availability/route";
import {
  GET as getBooking,
} from "@/app/api/bookings/[id]/route";
import { PATCH as cancelBooking } from "@/app/api/bookings/[id]/cancel/route";
import {
  GET as getBookings,
  POST as postBooking,
} from "@/app/api/bookings/route";
import { GET as getMe } from "@/app/api/me/route";
import { GET as getVehicleAvailability } from "@/app/api/vehicles/[slug]/availability/route";
import { GET as getVehicleQuote } from "@/app/api/vehicles/[slug]/quote/route";
import { GET as getVehicle } from "@/app/api/vehicles/[slug]/route";
import { GET as getVehicles } from "@/app/api/vehicles/route";
import {
  createPrismaClient,
  getPrismaClient,
} from "@/server/db/prisma";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const DAY_MS = 24 * 60 * 60 * 1_000;
const APP_ORIGIN = "https://booking.example.test";
const databaseUrl = requireTestDatabaseUrl();
const prisma = createPrismaClient(databaseUrl);
const originalAppOrigin = process.env.APP_ORIGIN;
const originalTrustProxyHeaders = process.env.TRUST_PROXY_HEADERS;
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `api_${randomUUID().replaceAll("-", "").slice(0, 14)}`;
  prefixes.push(prefix);
  return prefix;
}

function futureInterval(
  offsetDays: number,
  durationDays = 1,
): { startDate: Date; endDate: Date } {
  const startDate = new Date(Date.now() + offsetDays * DAY_MS);
  startDate.setUTCMilliseconds(0);
  return {
    startDate,
    endDate: new Date(startDate.getTime() + durationDays * DAY_MS),
  };
}

async function createUser(
  prefix: string,
  label: string,
  role: UserRole = UserRole.CUSTOMER,
): Promise<User> {
  return prisma.user.create({
    data: {
      id: `${prefix}_user_${label}`,
      name: `API ${label}`,
      email: `${prefix}_${label}@example.test`,
      role,
      status: UserStatus.ACTIVE,
      sessionVersion: 0,
    },
  });
}

async function createVehicle(prefix: string, label = "car") {
  const id = `${prefix}_vehicle_${label}`;
  const vehicle = await prisma.vehicle.create({
    data: {
      id,
      slug: `${prefix}-${label}`,
      brand: "Toyota",
      model: `Model ${label}`,
      year: 2025,
      category: `${prefix}_CATEGORY`,
      seats: 5,
      transmission: "AUTOMATIC",
      fuel: "PETROL",
      drive: "AWD",
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      insuranceIncluded: true,
      status: VehicleStatus.AVAILABLE,
      location: "Tbilisi",
    },
  });

  await prisma.pricingRule.createMany({
    data: [
      {
        id: `${id}_p1`,
        vehicleId: id,
        minDays: 1,
        maxDays: 2,
        pricePerDay: new Prisma.Decimal("100.00"),
        currency: "GEL",
      },
      {
        id: `${id}_p2`,
        vehicleId: id,
        minDays: 3,
        maxDays: 6,
        pricePerDay: new Prisma.Decimal("90.00"),
        currency: "GEL",
      },
      {
        id: `${id}_p3`,
        vehicleId: id,
        minDays: 7,
        maxDays: 14,
        pricePerDay: new Prisma.Decimal("80.00"),
        currency: "GEL",
      },
      {
        id: `${id}_p4`,
        vehicleId: id,
        minDays: 15,
        maxDays: null,
        pricePerDay: new Prisma.Decimal("70.00"),
        currency: "GEL",
      },
    ],
  });

  return vehicle;
}

function sessionFor(user: User) {
  return {
    expires: new Date(Date.now() + DAY_MS).toISOString(),
    user: {
      id: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
      name: user.name,
      email: user.email,
    },
  };
}

function setSession(user: User | null): void {
  authState.session = user ? sessionFor(user) : null;
  authState.queuedSessions = [];
}

function queueSessions(...users: User[]): void {
  authState.session = null;
  authState.queuedSessions = users.map(sessionFor);
}

function bookingPayload(
  vehicleId: string,
  interval: { startDate: Date; endDate: Date },
) {
  return {
    vehicleId,
    startDate: interval.startDate.toISOString(),
    endDate: interval.endDate.toISOString(),
    pickupLocation: "Tbilisi Airport",
    returnLocation: "Tbilisi Airport",
    customerComment: "API integration test",
  };
}

function mutationRequest(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  options: { origin?: string; idempotencyKey?: string } = {},
): Request {
  const headers = new Headers({
    "Content-Type": "application/json",
    Origin: options.origin ?? APP_ORIGIN,
    "Sec-Fetch-Site": "same-origin",
  });
  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }
  return new Request(`${APP_ORIGIN}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

async function postBookingFor(
  user: User,
  vehicleId: string,
  interval: { startDate: Date; endDate: Date },
  idempotencyKey?: string,
): Promise<Response> {
  setSession(user);
  return postBooking(
    mutationRequest(
      "/api/bookings",
      "POST",
      bookingPayload(vehicleId, interval),
      { idempotencyKey },
    ),
  );
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.auditLog.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { userId: { startsWith: prefix } },
        { vehicleId: { startsWith: prefix } },
      ],
    },
  });
  await prisma.vehicleImage.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.pricingRule.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

beforeAll(async () => {
  process.env.APP_ORIGIN = APP_ORIGIN;
  process.env.TRUST_PROXY_HEADERS = "false";
  await prisma.$connect();
});

afterEach(async () => {
  setSession(null);
  await cleanupTrackedPrefixes(prefixes, cleanup);
});

afterAll(async () => {
  try {
    await cleanupTrackedPrefixes(prefixes, cleanup);
  } finally {
    await prisma.$disconnect();
    await getPrismaClient().$disconnect();
    if (originalAppOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalAppOrigin;
    if (originalTrustProxyHeaders === undefined) {
      delete process.env.TRUST_PROXY_HEADERS;
    } else {
      process.env.TRUST_PROXY_HEADERS = originalTrustProxyHeaders;
    }
  }
});

describe("public and booking API integration", () => {
  it("creates, replays, lists, reads and cancels an own booking", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "owner");
    const vehicle = await createVehicle(prefix);
    const interval = futureInterval(30, 3);

    const created = await postBookingFor(
      user,
      vehicle.id,
      interval,
      `${prefix}-idempotency`,
    );
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe("private, no-store");
    const createdBody = await created.json();
    expect(createdBody.data).toMatchObject({
      replayed: false,
      booking: {
        vehicleId: vehicle.id,
        totalDays: 3,
        pricePerDay: "90.00",
        totalAmount: "270.00",
        depositAmount: "300.00",
        totalDue: "570.00",
      },
    });
    expect(JSON.stringify(createdBody)).not.toMatch(
      /managerComment|requestHash|idempotencyKey|userId/,
    );
    const bookingId = createdBody.data.booking.id as string;

    const replayed = await postBookingFor(
      user,
      vehicle.id,
      interval,
      `${prefix}-idempotency`,
    );
    expect(replayed.status).toBe(200);
    await expect(replayed.json()).resolves.toMatchObject({
      data: { replayed: true, booking: { id: bookingId } },
    });

    const list = await getBookings(
      new Request(`${APP_ORIGIN}/api/bookings?page=1&pageSize=10`),
    );
    expect(list.status).toBe(200);
    await expect(list.json()).resolves.toMatchObject({
      data: { items: [{ id: bookingId }], totalItems: 1 },
    });

    const detail = await getBooking(
      new Request(`${APP_ORIGIN}/api/bookings/${bookingId}`),
      { params: Promise.resolve({ id: bookingId }) },
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      data: { id: bookingId, vehicleId: vehicle.id },
    });

    const me = await getMe(new Request(`${APP_ORIGIN}/api/me`));
    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toEqual({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

    const cancelled = await cancelBooking(
      mutationRequest(`/api/bookings/${bookingId}/cancel`, "PATCH", {}),
      { params: Promise.resolve({ id: bookingId }) },
    );
    expect(cancelled.status).toBe(200);
    await expect(cancelled.json()).resolves.toMatchObject({
      data: { booking: { id: bookingId, status: "CANCELLED" } },
    });
  });

  it("returns one success and one 409 for parallel overlapping requests", async () => {
    const prefix = newPrefix();
    const firstUser = await createUser(prefix, "parallel-first");
    const secondUser = await createUser(prefix, "parallel-second");
    const vehicle = await createVehicle(prefix);
    const interval = futureInterval(50, 2);
    queueSessions(firstUser, secondUser);

    const responses = await Promise.all([
      postBooking(
        mutationRequest(
          "/api/bookings",
          "POST",
          bookingPayload(vehicle.id, interval),
        ),
      ),
      postBooking(
        mutationRequest(
          "/api/bookings",
          "POST",
          bookingPayload(vehicle.id, interval),
        ),
      ),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    const conflict = responses.find(({ status }) => status === 409);
    await expect(conflict?.json()).resolves.toMatchObject({
      error: { code: "VEHICLE_UNAVAILABLE" },
    });
  });

  it("returns 404 for another user's booking, including for a manager", async () => {
    const prefix = newPrefix();
    const owner = await createUser(prefix, "owner");
    const manager = await createUser(prefix, "manager", UserRole.MANAGER);
    const ownerVehicle = await createVehicle(prefix, "owner-car");
    const managerVehicle = await createVehicle(prefix, "manager-car");
    const ownerInterval = futureInterval(70, 1);
    const managerInterval = futureInterval(72, 1);
    const ownerResponse = await postBookingFor(
      owner,
      ownerVehicle.id,
      ownerInterval,
    );
    const ownerBody = await ownerResponse.json();
    const ownerBookingId = ownerBody.data.booking.id as string;

    setSession(manager);
    const foreign = await getBooking(
      new Request(`${APP_ORIGIN}/api/bookings/${ownerBookingId}`),
      { params: Promise.resolve({ id: ownerBookingId }) },
    );
    expect(foreign.status).toBe(404);
    await expect(foreign.json()).resolves.toMatchObject({
      error: { code: "BOOKING_NOT_FOUND" },
    });

    const foreignCancel = await cancelBooking(
      mutationRequest(
        `/api/bookings/${ownerBookingId}/cancel`,
        "PATCH",
        {},
      ),
      { params: Promise.resolve({ id: ownerBookingId }) },
    );
    expect(foreignCancel.status).toBe(404);

    const managerCreated = await postBookingFor(
      manager,
      managerVehicle.id,
      managerInterval,
    );
    expect(managerCreated.status).toBe(201);
    const managerBody = await managerCreated.json();
    const own = await getBooking(
      new Request(
        `${APP_ORIGIN}/api/bookings/${managerBody.data.booking.id}`,
      ),
      {
        params: Promise.resolve({ id: managerBody.data.booking.id }),
      },
    );
    expect(own.status).toBe(200);
  });

  it("returns 401 without a current session", async () => {
    setSession(null);
    const response = await getBookings(
      new Request(`${APP_ORIGIN}/api/bookings`),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
  });

  it("rejects a booking mutation from a foreign Origin", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "origin");
    const vehicle = await createVehicle(prefix);
    setSession(user);

    const response = await postBooking(
      mutationRequest(
        "/api/bookings",
        "POST",
        bookingPayload(vehicle.id, futureInterval(90)),
        { origin: "https://attacker.example" },
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNTRUSTED_ORIGIN" },
    });
    await expect(
      prisma.booking.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
  });

  it("limits booking creation to ten attempts per user per minute", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "limited");
    const interval = futureInterval(110);
    setSession(user);

    const responses: Response[] = [];
    for (let index = 0; index < 11; index += 1) {
      responses.push(
        await postBooking(
          mutationRequest(
            "/api/bookings",
            "POST",
            bookingPayload(`${prefix}_missing_${index}`, interval),
          ),
        ),
      );
    }

    expect(responses.slice(0, 10).every(({ status }) => status !== 429)).toBe(
      true,
    );
    expect(responses[10].status).toBe(429);
    expect(responses[10].headers.get("retry-after")).toBeTruthy();
    await expect(responses[10].json()).resolves.toMatchObject({
      error: { code: "RATE_LIMIT_EXCEEDED" },
    });
  });

  it("limits public reads to 120 requests per resolved IP per minute", async () => {
    const slug = `missing-${randomUUID()}`;
    process.env.TRUST_PROXY_HEADERS = "true";

    try {
      const responses: Response[] = [];
      for (let index = 0; index < 121; index += 1) {
        responses.push(
          await getVehicle(
            new Request(`${APP_ORIGIN}/api/vehicles/${slug}`, {
              headers: { "X-Forwarded-For": "203.0.113.25" },
            }),
            { params: Promise.resolve({ slug }) },
          ),
        );
      }

      expect(responses.slice(0, 120).every(({ status }) => status === 404)).toBe(
        true,
      );
      expect(responses[120].status).toBe(429);
      await expect(responses[120].json()).resolves.toMatchObject({
        error: { code: "RATE_LIMIT_EXCEEDED" },
      });
    } finally {
      process.env.TRUST_PROXY_HEADERS = "false";
    }
  });

  it("serves catalog, vehicle, availability and quote endpoints", async () => {
    const prefix = newPrefix();
    const vehicle = await createVehicle(prefix, "public");
    const interval = futureInterval(130, 3);
    const period = new URLSearchParams({
      startDate: interval.startDate.toISOString(),
      endDate: interval.endDate.toISOString(),
    });

    const catalog = await getVehicles(
      new Request(
        `${APP_ORIGIN}/api/vehicles?category=${encodeURIComponent(`${prefix}_CATEGORY`)}`,
      ),
    );
    expect(catalog.status).toBe(200);
    expect(catalog.headers.get("cache-control")).toContain("public");
    await expect(catalog.json()).resolves.toMatchObject({
      data: { items: [expect.objectContaining({ id: vehicle.id })] },
    });

    const detail = await getVehicle(
      new Request(`${APP_ORIGIN}/api/vehicles/${vehicle.slug}`),
      { params: Promise.resolve({ slug: vehicle.slug }) },
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      data: { id: vehicle.id, pricingRules: expect.any(Array) },
    });

    const availability = await getVehicleAvailability(
      new Request(
        `${APP_ORIGIN}/api/vehicles/${vehicle.slug}/availability?${period}`,
      ),
      { params: Promise.resolve({ slug: vehicle.slug }) },
    );
    expect(availability.status).toBe(200);
    await expect(availability.json()).resolves.toEqual({
      data: {
        vehicleId: vehicle.id,
        startDate: interval.startDate.toISOString(),
        endDate: interval.endDate.toISOString(),
        available: true,
      },
    });

    const quote = await getVehicleQuote(
      new Request(
        `${APP_ORIGIN}/api/vehicles/${vehicle.slug}/quote?${period}`,
      ),
      { params: Promise.resolve({ slug: vehicle.slug }) },
    );
    expect(quote.status).toBe(200);
    await expect(quote.json()).resolves.toMatchObject({
      data: {
        vehicleId: vehicle.id,
        available: true,
        quote: {
          totalDays: 3,
          pricePerDay: "90.00",
          totalAmount: "270.00",
          depositAmount: "300.00",
          totalDue: "570.00",
        },
      },
    });

    const available = await getAvailability(
      new Request(
        `${APP_ORIGIN}/api/availability?${period}&category=${encodeURIComponent(`${prefix}_CATEGORY`)}`,
      ),
    );
    expect(available.status).toBe(200);
    await expect(available.json()).resolves.toMatchObject({
      data: { items: [expect.objectContaining({ id: vehicle.id })] },
    });
  });
});
