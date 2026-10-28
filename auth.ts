import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { jwtCallback, sessionCallback } from "@/server/auth/callbacks";
import { authorizeCredentialsForAuth } from "@/server/auth/credentials-provider";
import { requireAuthSecret } from "@/server/config/auth";

// Validate runtime secrets on requests; image builds do not receive secrets.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: requireAuthSecret(),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  jwt: { maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        otp: { label: "Authenticator or backup code", type: "text" },
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      authorize: authorizeCredentialsForAuth,
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
}));
