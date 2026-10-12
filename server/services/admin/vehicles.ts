import { randomUUID } from "node:crypto";
import { Prisma, VehicleStatus, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  adminEventRepository,
  type AdminEventRepository,
} from "@/server/repositories/admin-events";
import {
  adminVehicleRepository,
  type AdminVehicleRepository,
  type AdminVehicleUpdateData,
} from "@/server/repositories/admin-vehicles";
import { lockUserById } from "@/server/repositories/users";
import {
  ADMIN_ONLY_ROLES,
  assertActiveAdminActor,
  MANAGER_ADMIN_ROLES,
  type AdminActorCommand,
} from "@/server/services/admin/authorization";
import {
  buildAdminPage,
  toAdminVehicleDto,
  type AdminPage,
  type AdminVehicleDto,
} from "@/server/services/admin/dto";
import { AdminServiceError } from "@/server/services/admin/errors";
import { runAdminTransaction } from "@/server/services/admin/transaction";
import {
  adminEntityIdSchema,
  adminImagesReplaceSchema,
  adminPricingReplaceSchema,
  adminVehicleCreateSchema,
  adminVehicleListQuerySchema,
  adminVehiclePatchSchema,
  type AdminVehiclePatchInput,
} from "@/server/validators/admin";

export type AdminVehicleDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: AdminVehicleRepository;
  events?: AdminEventRepository;
  now?: () => Date;
  requestId?: () => string;
}>;

type VehicleMutationCommand = AdminActorCommand &
  Readonly<{ vehicleId: unknown }>;

function requestIdFor(
  command: AdminActorCommand,
  dependencies: AdminVehicleDependencies,
): string {
  return command.requestId ?? dependencies.requestId?.() ?? randomUUID();
}

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

function mapVehiclePatch(
  input: AdminVehiclePatchInput,
): AdminVehicleUpdateData {
  return {
    ...input,
    ...(input.depositAmount !== undefined
      ? { depositAmount: decimal(input.depositAmount) }
      : {}),
  };
}

function mapVehiclePersistenceError(
  error: unknown,
  requestId: string,
): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AdminServiceError(
      "VEHICLE_SLUG_CONFLICT",
      409,
      "A vehicle with this slug already exists.",
      requestId,
    );
  }
  throw error;
}

async function requireLockedVehicle(
  repository: AdminVehicleRepository,
  transaction: Prisma.TransactionClient,
  vehicleId: string,
  requestId: string,
) {
  const vehicle = await repository.lockById(transaction, vehicleId);
  if (!vehicle) {
    throw new AdminServiceError(
      "VEHICLE_NOT_FOUND",
      404,
      "Vehicle was not found.",
      requestId,
    );
  }
  return vehicle;
}

export async function listAdminVehicles(
  input: unknown,
  dependencies: AdminVehicleDependencies = {},
): Promise<AdminPage<AdminVehicleDto>> {
  const query = adminVehicleListQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminVehicleRepository;
  const filters = { status: query.status, category: query.category };
  const offset = (query.page - 1) * query.pageSize;
  const [totalItems, vehicles] = await Promise.all([
    repository.count(prisma, filters),
    repository.findMany(prisma, filters, offset, query.pageSize),
  ]);
  return buildAdminPage(
    vehicles.map(toAdminVehicleDto),
    query.page,
    query.pageSize,
    totalItems,
  );
}

export async function createAdminVehicle(
  command: AdminActorCommand & Readonly<{ vehicle: unknown }>,
  dependencies: AdminVehicleDependencies = {},
): Promise<AdminVehicleDto> {
  const input = adminVehicleCreateSchema.parse(command.vehicle);
  const requestId = requestIdFor(command, dependencies);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminVehicleRepository;
  const events = dependencies.events ?? adminEventRepository;

  try {
    const vehicle = await runAdminTransaction(prisma, async (transaction) => {
      const actor = await lockUserById(transaction, command.actorUserId);
      assertActiveAdminActor(
        actor,
        command.expectedSessionVersion,
        MANAGER_ADMIN_ROLES,
        requestId,
      );
      const created = await repository.create(transaction, {
        ...input,
        depositAmount: decimal(input.depositAmount),
      });
      await events.createAudit(transaction, {
        actorUserId: command.actorUserId,
        action: "VEHICLE_CREATED",
        entity: "Vehicle",
        entityId: created.id,
        metadata: { requestId, status: created.status },
      });
      return created;
    });
    return toAdminVehicleDto(vehicle);
  } catch (error) {
    mapVehiclePersistenceError(error, requestId);
  }
}

export async function updateAdminVehicle(
  command: VehicleMutationCommand & Readonly<{ patch: unknown }>,
  dependencies: AdminVehicleDependencies = {},
): Promise<AdminVehicleDto> {
  const vehicleId = adminEntityIdSchema.parse(command.vehicleId);
  const input = adminVehiclePatchSchema.parse(command.patch);
  const requestId = requestIdFor(command, dependencies);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminVehicleRepository;
  const events = dependencies.events ?? adminEventRepository;

  try {
    const vehicle = await runAdminTransaction(prisma, async (transaction) => {
      const actor = await lockUserById(transaction, command.actorUserId);
      assertActiveAdminActor(
        actor,
        command.expectedSessionVersion,
        MANAGER_ADMIN_ROLES,
        requestId,
      );
      await requireLockedVehicle(repository, transaction, vehicleId, requestId);
      const updated = await repository.update(
        transaction,
        vehicleId,
        mapVehiclePatch(input),
      );
      await events.createAudit(transaction, {
        actorUserId: command.actorUserId,
        action: "VEHICLE_UPDATED",
        entity: "Vehicle",
        entityId: vehicleId,
        metadata: { requestId, fields: Object.keys(input).sort() },
      });
      return updated;
    });
    return toAdminVehicleDto(vehicle);
  } catch (error) {
    mapVehiclePersistenceError(error, requestId);
  }
}

export async function archiveAdminVehicle(
  command: VehicleMutationCommand,
  dependencies: AdminVehicleDependencies = {},
): Promise<AdminVehicleDto> {
  const vehicleId = adminEntityIdSchema.parse(command.vehicleId);
  const requestId = requestIdFor(command, dependencies);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminVehicleRepository;
  const events = dependencies.events ?? adminEventRepository;
  const now = dependencies.now?.() ?? new Date();

  const vehicle = await runAdminTransaction(prisma, async (transaction) => {
    const actor = await lockUserById(transaction, command.actorUserId);
    assertActiveAdminActor(
      actor,
      command.expectedSessionVersion,
      ADMIN_ONLY_ROLES,
      requestId,
    );
    const locked = await requireLockedVehicle(
      repository,
      transaction,
      vehicleId,
      requestId,
    );
    const futureBookings = await repository.lockFutureActiveBookings(
      transaction,
      vehicleId,
      now,
    );
    if (futureBookings.length > 0) {
      throw new AdminServiceError(
        "VEHICLE_HAS_FUTURE_BOOKINGS",
        409,
        "Vehicle has future active bookings.",
        requestId,
      );
    }
    if (locked.status === VehicleStatus.ARCHIVED) {
      const current = await repository.findById(transaction, vehicleId);
      if (!current) {
        throw new AdminServiceError(
          "VEHICLE_NOT_FOUND",
          404,
          "Vehicle was not found.",
          requestId,
        );
      }
      return current;
    }
    const archived = await repository.update(transaction, vehicleId, {
      status: VehicleStatus.ARCHIVED,
    });
    await events.createAudit(transaction, {
      actorUserId: command.actorUserId,
      action: "VEHICLE_ARCHIVED",
      entity: "Vehicle",
      entityId: vehicleId,
      metadata: { requestId, previousStatus: locked.status },
    });
    return archived;
  });
  return toAdminVehicleDto(vehicle);
}

export async function replaceAdminVehiclePricing(
  command: VehicleMutationCommand & Readonly<{ pricing: unknown }>,
  dependencies: AdminVehicleDependencies = {},
): Promise<AdminVehicleDto> {
  const vehicleId = adminEntityIdSchema.parse(command.vehicleId);
  const input = adminPricingReplaceSchema.parse(command.pricing);
  const requestId = requestIdFor(command, dependencies);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminVehicleRepository;
  const events = dependencies.events ?? adminEventRepository;

  const vehicle = await runAdminTransaction(prisma, async (transaction) => {
    const actor = await lockUserById(transaction, command.actorUserId);
    assertActiveAdminActor(
      actor,
      command.expectedSessionVersion,
      MANAGER_ADMIN_ROLES,
      requestId,
    );
    await requireLockedVehicle(repository, transaction, vehicleId, requestId);
    const rules = [...input.rules]
      .sort((left, right) => left.minDays - right.minDays)
      .map((rule) => ({
        ...rule,
        pricePerDay: decimal(rule.pricePerDay),
      }));
    await repository.replacePricing(transaction, vehicleId, rules);
    await events.createAudit(transaction, {
      actorUserId: command.actorUserId,
      action: "VEHICLE_PRICING_REPLACED",
      entity: "Vehicle",
      entityId: vehicleId,
      metadata: { requestId, ruleCount: rules.length },
    });
    const updated = await repository.findById(transaction, vehicleId);
    if (!updated) {
      throw new AdminServiceError(
        "VEHICLE_NOT_FOUND",
        404,
        "Vehicle was not found.",
        requestId,
      );
    }
    return updated;
  });
  return toAdminVehicleDto(vehicle);
}

export async function replaceAdminVehicleImages(
  command: VehicleMutationCommand & Readonly<{ images: unknown }>,
  dependencies: AdminVehicleDependencies = {},
): Promise<AdminVehicleDto> {
  const vehicleId = adminEntityIdSchema.parse(command.vehicleId);
  const input = adminImagesReplaceSchema.parse(command.images);
  const requestId = requestIdFor(command, dependencies);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminVehicleRepository;
  const events = dependencies.events ?? adminEventRepository;

  const vehicle = await runAdminTransaction(prisma, async (transaction) => {
    const actor = await lockUserById(transaction, command.actorUserId);
    assertActiveAdminActor(
      actor,
      command.expectedSessionVersion,
      MANAGER_ADMIN_ROLES,
      requestId,
    );
    await requireLockedVehicle(repository, transaction, vehicleId, requestId);
    await repository.replaceImages(transaction, vehicleId, input.images);
    await events.createAudit(transaction, {
      actorUserId: command.actorUserId,
      action: "VEHICLE_IMAGES_REPLACED",
      entity: "Vehicle",
      entityId: vehicleId,
      metadata: { requestId, imageCount: input.images.length },
    });
    const updated = await repository.findById(transaction, vehicleId);
    if (!updated) {
      throw new AdminServiceError(
        "VEHICLE_NOT_FOUND",
        404,
        "Vehicle was not found.",
        requestId,
      );
    }
    return updated;
  });
  return toAdminVehicleDto(vehicle);
}
