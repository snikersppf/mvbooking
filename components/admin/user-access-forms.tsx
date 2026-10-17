"use client";

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
  adminUserRoleFormSchema,
  adminUserStatusFormSchema,
  type AdminUserRoleFormValues,
  type AdminUserStatusFormValues,
} from "@/components/admin/form-schemas";
import { MutationFeedback } from "@/components/admin/mutation-feedback";
import { FieldError } from "@/components/ui/feedback";
import { ADMIN_USER_ROLES, ADMIN_USER_STATUSES } from "@/lib/admin-input";
import { formatAdminEnum } from "@/lib/admin-view";
import type { AdminUserDto } from "@/server/services/admin/dto";

type UserMutationState = Readonly<{
  error: string | null;
  success: string | null;
}>;

const EMPTY_STATE: UserMutationState = { error: null, success: null };

export function AdminUserRoleForm({
  userId,
  role,
}: Readonly<{ userId: string; role: AdminUserRoleFormValues["role"] }>) {
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
  const [state, setState] = useState<UserMutationState>(EMPTY_STATE);
  const [savedRole, setSavedRole] = useState(role);
  const {
    handleSubmit,
    register,
    reset,
    setError: setFieldError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AdminUserRoleFormValues>({
    resolver: zodResolver(adminUserRoleFormSchema),
    defaultValues: { role },
  });
  const onSubmit = handleSubmit(async (values) => {
    if (values.role === savedRole) return;
    setState(EMPTY_STATE);
    try {
      await requestAdminMutation<AdminUserDto>({
        path: `/api/admin/users/${encodeURIComponent(userId)}/role`,
        method: "PATCH",
        body: values,
      });
      setSavedRole(values.role);
      reset(values);
      setState({ error: null, success: "Role updated." });
      router.refresh();
    } catch (reason) {
      const hasFieldErrors = applyAdminFieldErrors(reason, setFieldError);
      setState({
        error: hasFieldErrors ? "Correct the highlighted field." : describeAdminMutationFailure(reason),
        success: null,
      });
    }
  });

  return (
    <form className="admin-inline-form" onSubmit={onSubmit}>
      <label>
        Role
        <select {...register("role")}>
          {ADMIN_USER_ROLES.map((value) => (
            <option key={value} value={value}>
              {formatAdminEnum(value)}
            </option>
          ))}
        </select>
        <FieldError message={errors.role?.message} />
      </label>
      <button className="button button-secondary" type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? "Saving…" : "Save role"}
      </button>
      <MutationFeedback error={state.error} success={state.success} />
    </form>
  );
}

export function AdminUserStatusForm({
  userId,
  status,
}: Readonly<{
  userId: string;
  status: AdminUserStatusFormValues["status"];
}>) {
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
  const [state, setState] = useState<UserMutationState>(EMPTY_STATE);
  const [savedStatus, setSavedStatus] = useState(status);
  const {
    handleSubmit,
    register,
    reset,
    setError: setFieldError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AdminUserStatusFormValues>({
    resolver: zodResolver(adminUserStatusFormSchema),
    defaultValues: { status },
  });
  const onSubmit = handleSubmit(async (values) => {
    if (values.status === savedStatus) return;
    setState(EMPTY_STATE);
    try {
      await requestAdminMutation<AdminUserDto>({
        path: `/api/admin/users/${encodeURIComponent(userId)}/status`,
        method: "PATCH",
        body: values,
      });
      setSavedStatus(values.status);
      reset(values);
      setState({ error: null, success: "Status updated." });
      router.refresh();
    } catch (reason) {
      const hasFieldErrors = applyAdminFieldErrors(reason, setFieldError);
      setState({
        error: hasFieldErrors ? "Correct the highlighted field." : describeAdminMutationFailure(reason),
        success: null,
      });
    }
  });

  return (
    <form className="admin-inline-form" onSubmit={onSubmit}>
      <label>
        Status
        <select {...register("status")}>
          {ADMIN_USER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {formatAdminEnum(value)}
            </option>
          ))}
        </select>
        <FieldError message={errors.status?.message} />
      </label>
      <button className="button button-secondary" type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? "Saving…" : "Save status"}
      </button>
      <MutationFeedback error={state.error} success={state.success} />
    </form>
  );
}

