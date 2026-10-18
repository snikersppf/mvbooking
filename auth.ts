import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { jwtCallback, sessionCallback } from "@/server/auth/callbacks";
import { authorizeCredentials } from "@/server/auth/credentials";
import { requireAuthSecret } from "@/server/config/auth";

// Validate runtime secrets on requests; image builds do not receive secrets.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: requireAuthSecret(),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
}));
