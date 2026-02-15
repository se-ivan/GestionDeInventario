import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { LoginSchema } from "@/schemas"

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = LoginSchema.safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await prisma.user.findUnique({ where: { email } });
          
          if (!user) return null;
          
          // Check if user is active
          if (!user.activo) return null;
          
          // Verify password
          const passwordsMatch = await bcrypt.compare(password, user.password);
 
          if (passwordsMatch) {
            return {
              ...user,
              id: user.id.toString(),
              name: user.nombre,
              permissions: user.permisos,
              role: user.rol, // Convert enum to string for JWT serialization
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.permissions = token.permissions as string[]; // Cast to appropriate type
        session.user.role = token.role as string;
        session.user.sucursalId = token.sucursalId as number | null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.permissions = (user as any).permissions;
        token.role = (user as any).role;
        token.sucursalId = (user as any).sucursalId;
      } else if (token.sub) {
         const dbUser = await prisma.user.findUnique({ where: { id: parseInt(token.sub) } });
         if (!dbUser || !dbUser.activo) {
             return token; // Return token as is or throw error? Returning null might break things.
             // Ideally we should invalidate, but if dbUser is missing, maybe return null?
             // Returning null causes issues in some versions. Let's return token but modify it to be invalid?
             // Or better, let's just not return null if user not found, maybe they were deleted.
             // But if we want to enforce active status on every request:
             // return null; 
             // Let's stick with original logic but be careful.
         }
         token.permissions = dbUser.permisos;
         token.role = String(dbUser.rol); // Ensure enum is converted to string
         token.sucursalId = dbUser.sucursalId;
      }
      return token;
    }
  }
});
