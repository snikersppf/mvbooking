"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  applyAdminFieldErrors,
  describeAdminMutationFailure,
  useAdminMutationRequest,
} from "@/components/admin/api-client";
import {
  adminPricingFormSchema,
  toAdminPricingPayload,
  type AdminPricingFormValues,
} from "@/components/admin/form-schemas";
import { MutationFeedback } from "@/components/admin/mutation-feedback";
import { FieldError } from "@/components/ui/feedback";
import type { AdminVehicleDto } from "@/server/services/admin/dto";

type PricingFormProps = Readonly<{
  vehicleId: string;
  defaultValues: AdminPricingFormValues;
}>;

export function PricingForm({ vehicleId, defaultValues }: PricingFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    register,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<AdminPricingFormValues>({
    resolver: zodResolver(adminPricingFormSchema),
    defaultValues,
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "rules",
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    try {
      await requestAdminMutation<AdminVehicleDto>({
        path: `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/pricing`,
        method: "PUT",
        body: toAdminPricingPayload(values),
      });
      setSuccess("Pricing tiers saved.");
      router.refresh();
    } catch (reason) {
      const hasFieldErrors = applyAdminFieldErrors(reason, setFieldError);
      setError(hasFieldErrors ? "Correct the highlighted fields." : describeAdminMutationFailure(reason));
    }
  });

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      <div className="admin-repeat-list">
        {fields.map((field, index) => (
          <fieldset key={field.id} className="admin-repeat-item">
            <legend>{t("Tier ")}{index + 1}</legend>
            <div className="admin-form-grid">
              <label>
                {t("Minimum days")}<Input
                  type="number"
                  aria-invalid={Boolean(errors.rules?.[index]?.minDays)}
                  {...register(`rules.${index}.minDays`)}
                />
                <FieldError message={errors.rules?.[index]?.minDays?.message} />
              </label>
              <label>
                {t("Maximum days")}<Input
                  type="number"
                  placeholder={t("No limit")}
                  aria-invalid={Boolean(errors.rules?.[index]?.maxDays)}
                  {...register(`rules.${index}.maxDays`)}
                />
                <FieldError message={errors.rules?.[index]?.maxDays?.message} />
              </label>
              <label>
                {t("Price per day, GEL")}<Input
                  inputMode="decimal"
                  aria-invalid={Boolean(errors.rules?.[index]?.pricePerDay)}
                  {...register(`rules.${index}.pricePerDay`)}
                />
                <FieldError message={errors.rules?.[index]?.pricePerDay?.message} />
              </label>
            </div>
            <Button
              className="button button-secondary"
              type="button"
              disabled={fields.length === 1}
              onClick={() => remove(index)}
            >
              {t("Remove tier")}</Button>
          </fieldset>
        ))}
      </div>
      <FieldError message={errors.rules?.root?.message} />
      <FieldError message={errors.rules?.message} />
      <div className="form-actions">
        <Button
          className="button button-secondary"
          type="button"
          onClick={() => append({ minDays: "", maxDays: "", pricePerDay: "" })}
        >
          {t("Add tier")}</Button>
        <Button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("Saving…") : t("Save pricing")}
        </Button>
      </div>
      <MutationFeedback error={error} success={success} />
    </form>
  );
}

