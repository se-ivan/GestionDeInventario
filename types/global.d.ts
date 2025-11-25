export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: 'admin' | 'caja' | 'ventas' | 'inventario';
    };
  }
}