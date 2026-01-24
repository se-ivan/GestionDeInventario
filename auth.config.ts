import type { NextAuthConfig } from "next-auth"
 
export const authConfig = {
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuth = nextUrl.pathname.startsWith('/auth');
      const isOnPublic = nextUrl.pathname === '/politicas-de-privacidad';
      
      // If user is logged in but inactive (safety check if not handled by jwt)
      // Note: In NextAuth v5, if jwt returns null, auth will be null.
      if (isLoggedIn && !auth.user) return false;

      // Default protection (protect everything except auth routes and public/static)
      // If user is not logged in and tries to access something that is not auth or public
      if (!isLoggedIn && !isOnAuth && !isOnPublic) {
        return false; // Redirect to login
      }

      if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
