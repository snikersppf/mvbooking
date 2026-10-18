import { randomUUID } from "node:crypto";
import { UserRole, UserStatus, type User } from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { renderLocalizedPage } from "@/tests/helpers/render-localized-page";

vi.mock("@/lib/i18n/server", async () => {
  const { createTranslator } = await import("@/lib/i18n/translate");
  return { getTranslations: async () => createTranslator("en") };
});

const authState = vi.hoisted(() => ({
  session: null as null | {
    user: { id: string; sessionVersion: number };
  },
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: vi.fn(async () => undefined) };
});

vi.mock("@/server/auth/current-user", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/auth/current-user")>();
  return {
    ...actual,
    requireCurrentUser: vi.fn(() =>
      actual.requireCurrentUserFromIdentity(
        authState.session
          ? {
              userId: authState.session.user.id,
              sessionVersion: authState.session.user.sessionVersion,
            }
          : null,
      ),
    ),
  };
});

import AdminPage from "@/app/admin/page";
import AdminAuditLogsPage from "@/app/admin/audit-logs/page";
import AdminUsersPage from "@/app/admin/users/page";
import AdminVehiclesPage from "@/app/admin/vehicles/page";
import {
  createPrismaClient,
  getPrismaClient,
} from "@/server/db/prisma";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const databaseUrl = requireTestDatabaseUrl();
const prisma = createPrismaClient(databaseUrl);
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `admin_pages_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  prefixes.push(prefix);
  return prefix;
}

async function createUser(prefix: string, role: UserRole): Promise<User> {
  return prisma.user.create({
    data: {
      id: `${prefix}_user`,
      name: `Page ${role}`,
      email: `${prefix}@example.test`,
      role,
      status: UserStatus.ACTIVE,
      sessionVersion: 0,
    },
  });
}

function setSession(user: User | null): void {
  authState.session = user
    ? { user: { id: user.id, sessionVersion: user.sessionVersion } }
    : null;
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.auditLog.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

async function captureRedirect(operation: () => Promise<unknown>) {
  let thrown: unknown;
  try {
    await operation();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeDefined();
  return (thrown as { digest?: string }).digest ?? "";
}

beforeAll(async () => {
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
  }
});

describe("admin page access integration", () => {
  it("redirects a CUSTOMER away from the administration pages", async () => {
    const prefix = newPrefix();
    const customer = await createUser(prefix, UserRole.CUSTOMER);
    setSession(customer);

    const overviewRedirect = await captureRedirect(() => AdminPage());
    expect(overviewRedirect).toContain("NEXT_REDIRECT");
    expect(overviewRedirect).toContain(";/;");

    const vehiclesRedirect = await captureRedirect(() =>
      AdminVehiclesPage({ searchParams: Promise.resolve({}) }),
    );
    expect(vehiclesRedirect).toContain(";/;");
  });

  it("lets a MANAGER open general admin pages but not users or audit logs", async () => {
    const prefix = newPrefix();
    const manager = await createUser(prefix, UserRole.MANAGER);
    setSession(manager);

    const vehicles = await AdminVehiclesPage({
      searchParams: Promise.resolve({}),
    });
    const rendered = await renderLocalizedPage(vehicles);
    expect(rendered).toContain("Vehicles");
    expect(rendered).toContain("Create vehicle");

    const usersRedirect = await captureRedirect(() =>
      AdminUsersPage({ searchParams: Promise.resolve({}) }),
    );
    expect(usersRedirect).toContain("/admin");

    const auditRedirect = await captureRedirect(() =>
      AdminAuditLogsPage({ searchParams: Promise.resolve({}) }),
    );
    expect(auditRedirect).toContain("/admin");
  });

  it("lets an ADMIN render the users page", async () => {
    const prefix = newPrefix();
    const admin = await createUser(prefix, UserRole.ADMIN);
    setSession(admin);

    const page = await AdminUsersPage({
      searchParams: Promise.resolve({ role: "ADMIN" }),
    });
    const rendered = await renderLocalizedPage(page);
    expect(rendered).toContain(admin.email);
    expect(rendered).toContain("Save role");
    expect(rendered).toContain("Save status");
  });
});
