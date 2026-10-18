"use client";
import { Button } from "@/components/ui/button";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <Button
      className="site-header-sign-out"
      type="button"
      onClick={() => { void signOut({ redirectTo: "/" }); }}
    >
      Sign out
    </Button>
  );
}
