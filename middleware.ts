import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 1. Definir rutas
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Manejo específico para UptimeRobot y peticiones HEAD en la raíz
  // Esto evita errores 405 y permite que el servicio de monitoreo funcione
  if (req.method === 'HEAD' && req.nextUrl.pathname === '/') {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // A. Protección básica: Si no está logueado y la ruta es protegida
  if (!userId && isProtectedRoute(req)) {
    return redirectToSignIn();
  }

  // B. Protección por ROLES:
  // Si intenta entrar a ruta de admin Y (no tiene metadata O el rol no es admin)
  if (
    isAdminRoute(req) && 
    sessionClaims?.metadata?.role !== 'admin'
  ) {
    // Redirigir a home o página de error 403
    return NextResponse.redirect(new URL('/', req.url));
  }

  // C. Tu lógica de Headers (X-Robots-Tag)
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};