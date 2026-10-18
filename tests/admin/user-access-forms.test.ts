import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import {
  AdminUserRoleForm,
  AdminUserStatusForm,
} from "@/components/admin/user-access-forms";

describe("admin user access forms", () => {
  it("starts with both save buttons disabled for unchanged values", () => {
    const role = renderToStaticMarkup(
      createElement(AdminUserRoleForm, { userId: "user-1", role: "ADMIN" }),
    );
    const status = renderToStaticMarkup(
      createElement(AdminUserStatusForm, { userId: "user-1", status: "ACTIVE" }),
    );
    expect(role).toMatch(/<button[^>]*disabled=""[^>]*>Сохранить роль<\/button>/);
    expect(status).toMatch(/<button[^>]*disabled=""[^>]*>Сохранить статус<\/button>/);
  });
});
