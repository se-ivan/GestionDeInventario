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
              permissions: user.permisos, // Map database 'permisos' to 'permissions'
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
      }
      return session;
    },
    async jwt({ token }) {
      // Fetch fresh user data if needed or just pass it through
      if (token.sub) {
         const user = await prisma.user.findUnique({ where: { id: parseInt(token.sub) } });
         if (!user || !user.activo) {
             return null; // This will invalidate the session
         }
         token.permissions = user.permisos;
         token.role = user.rol;
      }
      return token;
    }
  }
});
