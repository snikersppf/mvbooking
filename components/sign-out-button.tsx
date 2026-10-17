"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="site-header-sign-out"
      type="button"
      onClick={() => { void signOut({ redirectTo: "/" }); }}
    >
      Sign out
    </button>
  );
}
