import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clearLoginRateLimit, isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;
        if (isLoginRateLimited(email)) throw new Error("Troppi tentativi di login");

        const users = await prisma.user.findMany({ where: { email } });
        if (users.length === 0) {
          recordFailedLoginAttempt(email);
          return null;
        }

        const matched: typeof users = [];
        for (const user of users) {
          if (await bcrypt.compare(password, user.passwordHash)) {
            matched.push(user);
          }
        }
        if (matched.length !== 1) {
          recordFailedLoginAttempt(email);
          return null;
        }
        const user = matched[0];

        clearLoginRateLimit(email);

        return { id: user.id, email: user.email, role: user.ruolo, salonId: user.salonId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: "OWNER" | "MANAGER" | "STAFF" }).role;
        token.salonId = (user as { salonId: string }).salonId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "OWNER" | "MANAGER" | "STAFF";
        session.user.salonId = token.salonId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

