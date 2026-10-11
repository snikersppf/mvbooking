import type { CurrentUser } from "@/server/auth/current-user";

export type CurrentUserProfile = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: CurrentUser["role"];
}>;

export function toCurrentUserProfile(user: CurrentUser): CurrentUserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}
