"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  applyAdminFieldErrors,
  describeAdminMutationFailure,
  useAdminMutationRequest,
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
  const t = useTranslations();
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
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
          {t("Slug")}<Input aria-invalid={Boolean(errors.slug)} {...register("slug")} />
          <FieldError message={errors.slug?.message} />
        </label>
        <label>
          {t("Brand")}<Input aria-invalid={Boolean(errors.brand)} {...register("brand")} />
          <FieldError message={errors.brand?.message} />
        </label>
        <label>
          {t("Model")}<Input aria-invalid={Boolean(errors.model)} {...register("model")} />
          <FieldError message={errors.model?.message} />
        </label>
        <label>
          {t("Year")}<Input type="number" aria-invalid={Boolean(errors.year)} {...register("year")} />
          <FieldError message={errors.year?.message} />
        </label>
        <label>
          {t("Category")}<Select {...register("category")}>
            {ADMIN_VEHICLE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(formatAdminEnum(value))}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {t("Seats")}<Input type="number" aria-invalid={Boolean(errors.seats)} {...register("seats")} />
          <FieldError message={errors.seats?.message} />
        </label>
        <label>
          {t("Transmission")}<Select {...register("transmission")}>
            {ADMIN_TRANSMISSIONS.map((value) => (
              <option key={value} value={value}>
                {t(formatAdminEnum(value))}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {t("Fuel")}<Select {...register("fuel")}>
            {ADMIN_FUELS.map((value) => (
              <option key={value} value={value}>
                {t(formatAdminEnum(value))}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {t("Drive")}<Select {...register("drive")}>
            {ADMIN_DRIVES.map((value) => (
              <option key={value} value={value}>
                {t(formatAdminEnum(value))}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {t("Engine")}<Input aria-invalid={Boolean(errors.engine)} {...register("engine")} />
          <FieldError message={errors.engine?.message} />
        </label>
        <label>
          {t("Deposit, GEL")}<Input inputMode="decimal" aria-invalid={Boolean(errors.depositAmount)} {...register("depositAmount")} />
          <FieldError message={errors.depositAmount?.message} />
        </label>
        <label>
          {t("Status")}<Select {...register("status")}>
            {ADMIN_EDITABLE_VEHICLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(formatAdminEnum(value))}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {t("Location")}<Input aria-invalid={Boolean(errors.location)} {...register("location")} />
          <FieldError message={errors.location?.message} />
        </label>
        <label className="admin-checkbox-field">
          <Input type="checkbox" {...register("insuranceIncluded")} />
          {t("Insurance included")}</label>
      </div>
      <label>
        {t("Description")}<Textarea rows={5} aria-invalid={Boolean(errors.description)} {...register("description")} />
        <FieldError message={errors.description?.message} />
      </label>
      <Button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? t("Saving…")
          : mode === "create"
            ? t("Create vehicle")
            : t("Save vehicle")}
      </Button>
      <MutationFeedback error={error} success={success} />
    </form>
  );
}
