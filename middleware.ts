import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Añade la cabecera X-Robots-Tag a todas las respuestas
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
}