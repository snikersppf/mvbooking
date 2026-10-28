import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  PaymentStatus,
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

// Mock only the Auth.js session boundary. Every request still uses the real
// database-backed user/status/sessionVersion guard.
vi.mock("@/server/auth/current-user", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/auth/current-user")>();

  return {
    ...actual,
    requireCurrentUser: vi.fn(async () => {
      const session =
        authState.queuedSessions.shift() ?? authState.session;
      return actual.requireCurrentUserFromIdentity(
        session
          ? {
              userId: session.user.id,
              sessionVersion: session.user.sessionVersion,
              mfaVerified: true,
            }
          : null,
      );
    }),
  };
});

import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route";
import { GET as getAdminBooking } from "@/app/api/admin/bookings/[id]/route";
import { PATCH as patchBookingStatus } from "@/app/api/admin/bookings/[id]/status/route";
import { GET as getAdminBookings } from "@/app/api/admin/bookings/route";
import { PUT as putVehicleImages } from "@/app/api/admin/vehicles/[id]/images/route";
import { PUT as putVehiclePricing } from "@/app/api/admin/vehicles/[id]/pricing/route";
import {
  DELETE as deleteVehicle,
  PATCH as patchVehicle,
} from "@/app/api/admin/vehicles/[id]/route";
import {
  GET as getAdminVehicles,
  POST as postVehicle,
} from "@/app/api/admin/vehicles/route";
import { PATCH as patchUserRole } from "@/app/api/admin/users/[id]/role/route";
import { PATCH as patchUserStatus } from "@/app/api/admin/users/[id]/status/route";
import { GET as getAdminUsers } from "@/app/api/admin/users/route";
import { GET as getOwnBooking } from "@/app/api/bookings/[id]/route";
import { GET as getMe } from "@/app/api/me/route";
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
  const prefix = `admin_${randomUUID().replaceAll("-", "").slice(0, 14)}`;
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
  role: UserRole,
): Promise<User> {
  return prisma.user.create({
    data: {
      id: `${prefix}_user_${label}`,
      name: `Admin API ${label}`,
      email: `${prefix}_${label}@example.test`,
      passwordHash: "must-never-be-returned",
      role,
      status: UserStatus.ACTIVE,
      sessionVersion: 0,
      totpEnabledAt: new Date(),
    },
  });
}

async function createVehicle(prefix: string, label: string) {
  return prisma.vehicle.create({
    data: {
      id: `${prefix}_vehicle_${label}`,
      slug: `${prefix}-${label}`,
      brand: "Toyota",
      model: `Model ${label}`,
      year: 2025,
      category: "SUV",
      seats: 5,
      transmission: "AUTOMATIC",
      fuel: "HYBRID",
      drive: "AWD",
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      insuranceIncluded: true,
      status: VehicleStatus.AVAILABLE,
      location: "Tbilisi",
    },
  });
}

async function createBooking(
  prefix: string,
  label: string,
  userId: string,
  vehicleId: string,
  options: {
    status?: BookingStatus;
    managerComment?: string | null;
    offsetDays?: number;
  } = {},
) {
  const interval = futureInterval(options.offsetDays ?? 30, 2);
  return prisma.booking.create({
    data: {
      id: `${prefix}_booking_${label}`,
      userId,
      vehicleId,
      startDate: interval.startDate,
      endDate: interval.endDate,
      pickupLocation: "Tbilisi Airport",
      returnLocation: "Tbilisi Airport",
      totalDays: 2,
      pricePerDay: new Prisma.Decimal("100.00"),
      totalAmount: new Prisma.Decimal("200.00"),
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      status: options.status ?? BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      customerComment: "Customer note",
      managerComment: options.managerComment ?? null,
    },
  });
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

function mutationRequest(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  origin = APP_ORIGIN,
): Request {
  return new Request(`${APP_ORIGIN}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function vehiclePayload(slug: string) {
  return {
    slug,
    brand: "Toyota",
    model: "RAV4",
    year: 2025,
    category: "SUV",
    description: "Admin managed vehicle",
    seats: 5,
    transmission: "AUTOMATIC",
    fuel: "HYBRID",
    drive: "AWD",
    engine: "2.5",
    depositAmount: "300.005",
    currency: "GEL",
    insuranceIncluded: true,
    status: "AVAILABLE",
    location: "Tbilisi",
  };
}

const pricingPayload = {
  rules: [
    { minDays: 1, maxDays: 2, pricePerDay: "33.335" },
    { minDays: 3, maxDays: 6, pricePerDay: "30.00" },
    { minDays: 7, maxDays: 14, pricePerDay: "27.00" },
    { minDays: 15, maxDays: null, pricePerDay: "24.00" },
  ],
};

async function cleanup(prefix: string): Promise<void> {
  const slugPrefix = prefix.replaceAll("_", "-");
  const vehicleIds = (
    await prisma.vehicle.findMany({
      where: {
        OR: [
          { id: { startsWith: prefix } },
          { slug: { startsWith: slugPrefix } },
        ],
      },
      select: { id: true },
    })
  ).map(({ id }) => id);

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
        { vehicleId: { in: vehicleIds } },
      ],
    },
  });
  await prisma.vehicleImage.deleteMany({
    where: { vehicleId: { in: vehicleIds } },
  });
  await prisma.pricingRule.deleteMany({
    where: { vehicleId: { in: vehicleIds } },
  });
  await prisma.vehicle.deleteMany({
    where: { id: { in: vehicleIds } },
  });
  await prisma.passwordResetToken.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
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

describe("admin API integration", () => {
  it("returns 403 to a customer for the admin API", async () => {
    const prefix = newPrefix();
    const customer = await createUser(prefix, "customer", UserRole.CUSTOMER);
    setSession(customer);

    const response = await getAdminVehicles(
      new Request(`${APP_ORIGIN}/api/admin/vehicles`),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("lets a manager create and update whitelisted vehicle data", async () => {
    const prefix = newPrefix();
    const slug = `${prefix.replaceAll("_", "-")}-created`;
    const manager = await createUser(prefix, "manager", UserRole.MANAGER);
    setSession(manager);

    const created = await postVehicle(
      mutationRequest(
        "/api/admin/vehicles",
        "POST",
        vehiclePayload(slug),
      ),
    );
    const createdBody = await created.json();
    expect(
      created.status,
      JSON.stringify(createdBody.error?.fieldErrors),
    ).toBe(201);
    const vehicleId = createdBody.data.id as string;
    expect(createdBody.data).toMatchObject({
      slug,
      depositAmount: "300.01",
      status: "AVAILABLE",
    });

    const pricing = await putVehiclePricing(
      mutationRequest(
        `/api/admin/vehicles/${vehicleId}/pricing`,
        "PUT",
        pricingPayload,
      ),
      { params: Promise.resolve({ id: vehicleId }) },
    );
    expect(pricing.status).toBe(200);
    await expect(pricing.json()).resolves.toMatchObject({
      data: {
        pricingRules: [
          expect.objectContaining({ minDays: 1, pricePerDay: "33.34" }),
          expect.objectContaining({ minDays: 3, pricePerDay: "30.00" }),
          expect.objectContaining({ minDays: 7, pricePerDay: "27.00" }),
          expect.objectContaining({ minDays: 15, pricePerDay: "24.00" }),
        ],
      },
    });

    const images = await putVehicleImages(
      mutationRequest(
        `/api/admin/vehicles/${vehicleId}/images`,
        "PUT",
        {
          images: [
            { url: "/vehicles/front.jpg", alt: "Front", sortOrder: 0 },
            {
              url: "https://cdn.example.test/side.jpg",
              alt: null,
              sortOrder: 1,
            },
          ],
        },
      ),
      { params: Promise.resolve({ id: vehicleId }) },
    );
    expect(images.status).toBe(200);

    const patched = await patchVehicle(
      mutationRequest(
        `/api/admin/vehicles/${vehicleId}`,
        "PATCH",
        { model: "RAV4 Hybrid", location: "Batumi" },
      ),
      { params: Promise.resolve({ id: vehicleId }) },
    );
    expect(patched.status).toBe(200);
    await expect(patched.json()).resolves.toMatchObject({
      data: { id: vehicleId, model: "RAV4 Hybrid", location: "Batumi" },
    });

    const listed = await getAdminVehicles(
      new Request(
        `${APP_ORIGIN}/api/admin/vehicles?status=AVAILABLE&pageSize=50`,
      ),
    );
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as {
      data: {
        items: Array<{ id: string; slug: string }>;
        pageSize: number;
      };
    };
    const prefixedItems = listedBody.data.items.filter(({ slug: itemSlug }) =>
      itemSlug.startsWith(prefix.replaceAll("_", "-")),
    );
    expect(prefixedItems).toEqual([
      expect.objectContaining({ id: vehicleId }),
    ]);
    expect(listedBody.data.pageSize).toBe(50);

    const forbiddenArchive = await deleteVehicle(
      mutationRequest(
        `/api/admin/vehicles/${vehicleId}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: vehicleId }) },
    );
    expect(forbiddenArchive.status).toBe(403);

    await expect(
      prisma.auditLog.count({
        where: {
          userId: manager.id,
          entityId: vehicleId,
          action: {
            in: [
              "VEHICLE_CREATED",
              "VEHICLE_PRICING_REPLACED",
              "VEHICLE_IMAGES_REPLACED",
              "VEHICLE_UPDATED",
            ],
          },
        },
      }),
    ).resolves.toBe(4);
  });

  it("archives instead of deleting and rejects future active bookings", async () => {
    const prefix = newPrefix();
    const admin = await createUser(prefix, "admin", UserRole.ADMIN);
    const customer = await createUser(prefix, "customer", UserRole.CUSTOMER);
    const vehicle = await createVehicle(prefix, "archive");
    const booking = await createBooking(
      prefix,
      "archive",
      customer.id,
      vehicle.id,
    );
    setSession(admin);

    const blocked = await deleteVehicle(
      mutationRequest(
        `/api/admin/vehicles/${vehicle.id}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: vehicle.id }) },
    );
    expect(blocked.status).toBe(409);
    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: "VEHICLE_HAS_FUTURE_BOOKINGS" },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });
    const archived = await deleteVehicle(
      mutationRequest(
        `/api/admin/vehicles/${vehicle.id}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: vehicle.id }) },
    );
    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({
      data: { id: vehicle.id, status: "ARCHIVED" },
    });
    await expect(
      prisma.vehicle.findUnique({ where: { id: vehicle.id } }),
    ).resolves.toMatchObject({ status: VehicleStatus.ARCHIVED });
  });

  it("lists admin booking data and changes status through the transition service", async () => {
    const prefix = newPrefix();
    const manager = await createUser(prefix, "manager", UserRole.MANAGER);
    const customer = await createUser(prefix, "customer", UserRole.CUSTOMER);
    const vehicle = await createVehicle(prefix, "booking");
    const booking = await createBooking(
      prefix,
      "managed",
      customer.id,
      vehicle.id,
      { managerComment: "Internal note" },
    );
    setSession(manager);

    const list = await getAdminBookings(
      new Request(
        `${APP_ORIGIN}/api/admin/bookings?userId=${customer.id}&pageSize=50`,
      ),
    );
    expect(list.status).toBe(200);
    await expect(list.json()).resolves.toMatchObject({
      data: {
        items: [
          expect.objectContaining({
            id: booking.id,
            managerComment: "Internal note",
          }),
        ],
      },
    });

    const detail = await getAdminBooking(
      new Request(`${APP_ORIGIN}/api/admin/bookings/${booking.id}`),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      data: { id: booking.id, managerComment: "Internal note" },
    });

    const changed = await patchBookingStatus(
      mutationRequest(
        `/api/admin/bookings/${booking.id}/status`,
        "PATCH",
        { status: "CONFIRMED", managerComment: "Approved" },
      ),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(changed.status).toBe(200);
    await expect(changed.json()).resolves.toMatchObject({
      data: {
        id: booking.id,
        status: "CONFIRMED",
        managerComment: "Approved",
      },
    });

    setSession(customer);
    const publicDetail = await getOwnBooking(
      new Request(`${APP_ORIGIN}/api/bookings/${booking.id}`),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(publicDetail.status).toBe(200);
    expect(JSON.stringify(await publicDetail.json())).not.toContain(
      "managerComment",
    );
  });

  it("protects the final active ADMIN and revokes sessions on role change", async () => {
    const prefix = newPrefix();
    const firstAdmin = await createUser(prefix, "first-admin", UserRole.ADMIN);
    setSession(firstAdmin);

    const finalRole = await patchUserRole(
      mutationRequest(
        `/api/admin/users/${firstAdmin.id}/role`,
        "PATCH",
        { role: "MANAGER" },
      ),
      { params: Promise.resolve({ id: firstAdmin.id }) },
    );
    expect(finalRole.status).toBe(409);
    await expect(finalRole.json()).resolves.toMatchObject({
      error: { code: "LAST_ACTIVE_ADMIN" },
    });

    const finalStatus = await patchUserStatus(
      mutationRequest(
        `/api/admin/users/${firstAdmin.id}/status`,
        "PATCH",
        { status: "INACTIVE" },
      ),
      { params: Promise.resolve({ id: firstAdmin.id }) },
    );
    expect(finalStatus.status).toBe(409);

    const secondAdmin = await createUser(
      prefix,
      "second-admin",
      UserRole.ADMIN,
    );
    authState.session = null;
    authState.queuedSessions = [
      sessionFor(firstAdmin),
      sessionFor(secondAdmin),
    ];
    const roleChanges = await Promise.all([
      patchUserRole(
        mutationRequest(
          `/api/admin/users/${firstAdmin.id}/role`,
          "PATCH",
          { role: "MANAGER" },
        ),
        { params: Promise.resolve({ id: firstAdmin.id }) },
      ),
      patchUserRole(
        mutationRequest(
          `/api/admin/users/${secondAdmin.id}/role`,
          "PATCH",
          { role: "MANAGER" },
        ),
        { params: Promise.resolve({ id: secondAdmin.id }) },
      ),
    ]);
    expect(roleChanges.map(({ status }) => status).sort()).toEqual([
      200,
      409,
    ]);
    const blockedRoleChange = roleChanges.find(
      ({ status }) => status === 409,
    );
    expect(blockedRoleChange).toBeDefined();
    await expect(blockedRoleChange?.json()).resolves.toMatchObject({
      error: { code: "LAST_ACTIVE_ADMIN" },
    });

    const administrators = await prisma.user.findMany({
      where: { id: { in: [firstAdmin.id, secondAdmin.id] } },
      orderBy: { id: "asc" },
    });
    const activeAdministrators = administrators.filter(
      ({ role, status }) =>
        role === UserRole.ADMIN && status === UserStatus.ACTIVE,
    );
    expect(activeAdministrators).toHaveLength(1);
    const demotedAdmin = administrators.find(
      ({ role }) => role === UserRole.MANAGER,
    );
    expect(demotedAdmin).toBeDefined();

    const staleAdmin =
      demotedAdmin?.id === firstAdmin.id ? firstAdmin : secondAdmin;
    setSession(staleAdmin);
    const staleSession = await getMe(
      new Request(`${APP_ORIGIN}/api/me`),
    );
    expect(staleSession.status).toBe(401);

    setSession(activeAdministrators[0]);
    const users = await getAdminUsers(
      new Request(`${APP_ORIGIN}/api/admin/users?pageSize=50`),
    );
    expect(users.status).toBe(200);
    const usersBody = await users.json();
    expect(JSON.stringify(usersBody)).not.toContain("passwordHash");

    const auditLogs = await getAuditLogs(
      new Request(
        `${APP_ORIGIN}/api/admin/audit-logs?action=USER_ROLE_CHANGED`,
      ),
    );
    expect(auditLogs.status).toBe(200);
    await expect(auditLogs.json()).resolves.toMatchObject({
      data: {
        items: [
          expect.objectContaining({
            action: "USER_ROLE_CHANGED",
            entityId: demotedAdmin?.id,
          }),
        ],
      },
    });
  });

  it("rejects foreign origins and limits admin mutations to 60 per minute", async () => {
    const prefix = newPrefix();
    const admin = await createUser(prefix, "limited-admin", UserRole.ADMIN);
    setSession(admin);

    const foreignOrigin = await patchVehicle(
      mutationRequest(
        "/api/admin/vehicles/missing",
        "PATCH",
        { location: "Batumi" },
        "https://attacker.example",
      ),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(foreignOrigin.status).toBe(403);
    await expect(foreignOrigin.json()).resolves.toMatchObject({
      error: { code: "UNTRUSTED_ORIGIN" },
    });

    const responses: Response[] = [];
    for (let index = 0; index < 61; index += 1) {
      responses.push(
        await patchVehicle(
          mutationRequest(
            `/api/admin/vehicles/${prefix}_missing_${index}`,
            "PATCH",
            { location: "Batumi" },
          ),
          {
            params: Promise.resolve({
              id: `${prefix}_missing_${index}`,
            }),
          },
        ),
      );
    }

    expect(responses.slice(0, 60).every(({ status }) => status === 404)).toBe(
      true,
    );
    expect(responses[60].status).toBe(429);
    expect(responses[60].headers.get("retry-after")).toBeTruthy();
    await expect(responses[60].json()).resolves.toMatchObject({
      error: { code: "RATE_LIMIT_EXCEEDED" },
    });
  });
});
