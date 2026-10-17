"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  applyAdminFieldErrors,
  createAdminIdempotencyKey,
  describeAdminMutationFailure,
  requestAdminMutation,
} from "@/components/admin/api-client";
import {
  adminVehicleFormSchema,
  toAdminVehicleCreatePayload,
  toAdminVehiclePatchPayload,
  type AdminVehicleFormValues,
} from "@/components/admin/form-schemas";
import { MutationFeedback } from "@/components/admin/mutation-feedback";
import { FieldError } from "@/components/ui/feedback";
import {
  ADMIN_DRIVES,
  ADMIN_EDITABLE_VEHICLE_STATUSES,
  ADMIN_FUELS,
  ADMIN_TRANSMISSIONS,
  ADMIN_VEHICLE_CATEGORIES,
} from "@/lib/admin-input";
import { formatAdminEnum } from "@/lib/admin-view";
import type { AdminVehicleDto } from "@/server/services/admin/dto";

type VehicleFormProps = Readonly<{
  mode: "create" | "edit";
  vehicleId?: string;
  defaultValues: AdminVehicleFormValues;
}>;

export function VehicleForm({
  mode,
  vehicleId,
  defaultValues,
}: VehicleFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    handleSubmit,
    register,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<AdminVehicleFormValues>({
    resolver: zodResolver(adminVehicleFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    const isCreate = mode === "create";
    if (!isCreate && !vehicleId) {
      setError("The vehicle identifier is missing.");
      return;
    }
    let path = "/api/admin/vehicles";
    if (!isCreate && vehicleId) {
      path = `/api/admin/vehicles/${encodeURIComponent(vehicleId)}`;
    }

    try {
      const vehicle = await requestAdminMutation<AdminVehicleDto>({
        path,
        method: isCreate ? "POST" : "PATCH",
        body: isCreate
          ? toAdminVehicleCreatePayload(values)
          : toAdminVehiclePatchPayload(values),
        idempotencyKey: createAdminIdempotencyKey(),
      });
      if (isCreate) {
        router.push(`/admin/vehicles/${encodeURIComponent(vehicle.id)}`);
      } else {
        setSuccess("Vehicle details saved.");
      }
      router.refresh();
    } catch (reason) {
      const hasFieldErrors = applyAdminFieldErrors(reason, setFieldError);
      setError(hasFieldErrors ? "Correct the highlighted fields." : describeAdminMutationFailure(reason));
    }
  });

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      <div className="admin-form-grid">
        <label>
          Slug
          <input aria-invalid={Boolean(errors.slug)} {...register("slug")} />
          <FieldError message={errors.slug?.message} />
        </label>
        <label>
          Brand
          <input aria-invalid={Boolean(errors.brand)} {...register("brand")} />
          <FieldError message={errors.brand?.message} />
        </label>
        <label>
          Model
          <input aria-invalid={Boolean(errors.model)} {...register("model")} />
          <FieldError message={errors.model?.message} />
        </label>
        <label>
          Year
          <input type="number" aria-invalid={Boolean(errors.year)} {...register("year")} />
          <FieldError message={errors.year?.message} />
        </label>
        <label>
          Category
          <select {...register("category")}>
            {ADMIN_VEHICLE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {formatAdminEnum(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seats
          <input type="number" aria-invalid={Boolean(errors.seats)} {...register("seats")} />
          <FieldError message={errors.seats?.message} />
        </label>
        <label>
          Transmission
          <select {...register("transmission")}>
            {ADMIN_TRANSMISSIONS.map((value) => (
              <option key={value} value={value}>
                {formatAdminEnum(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fuel
          <select {...register("fuel")}>
            {ADMIN_FUELS.map((value) => (
              <option key={value} value={value}>
                {formatAdminEnum(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Drive
          <select {...register("drive")}>
            {ADMIN_DRIVES.map((value) => (
              <option key={value} value={value}>
                {formatAdminEnum(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Engine
          <input aria-invalid={Boolean(errors.engine)} {...register("engine")} />
          <FieldError message={errors.engine?.message} />
        </label>
        <label>
          Deposit, GEL
          <input inputMode="decimal" aria-invalid={Boolean(errors.depositAmount)} {...register("depositAmount")} />
          <FieldError message={errors.depositAmount?.message} />
        </label>
        <label>
          Status
          <select {...register("status")}>
            {ADMIN_EDITABLE_VEHICLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {formatAdminEnum(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <input aria-invalid={Boolean(errors.location)} {...register("location")} />
          <FieldError message={errors.location?.message} />
        </label>
        <label className="admin-checkbox-field">
          <input type="checkbox" {...register("insuranceIncluded")} />
          Insurance included
        </label>
      </div>
      <label>
        Description
        <textarea rows={5} aria-invalid={Boolean(errors.description)} {...register("description")} />
        <FieldError message={errors.description?.message} />
      </label>
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Saving…"
          : mode === "create"
            ? "Create vehicle"
            : "Save vehicle"}
      </button>
      <MutationFeedback error={error} success={success} />
    </form>
  );
}
