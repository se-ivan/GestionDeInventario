"use client"

import { useState } from "react" // --> 1. Importar useState
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" // --> 2. Importar Label
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Minus, Plus, Trash2, CreditCard, Banknote, Landmark } from "lucide-react"

interface CartItem {
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
  quantity: number
}

interface ShoppingCartProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (bookId: number, quantity: number) => void
  // --> 3. Actualizar la firma de la función onProcessSale
  onProcessSale: (paymentMethod: string) => void
  isLoading: boolean
}

export function ShoppingCart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onProcessSale,
  isLoading,
}: ShoppingCartProps) {
  // --> 4. Añadir estado para el método de pago, con "Efectivo" como valor inicial
  const [paymentMethod, setPaymentMethod] = useState("Efectivo")

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + item.precio * item.quantity, 0)
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carrito de Compras ({getTotalItems()} productos)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">El carrito está vacío</p>
            </div>
          ) : (
            <>
              {/* El mapeo de items no cambia */}
              {items.map((item) => (
                <Card key={item.id} className="p-4">
                  {/* ...código del item sin cambios... */}
                </Card>
              ))}

              <div className="border-t pt-4 space-y-4">
                

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">${getTotalAmount().toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                    Continuar Comprando
                  </Button>
                  {/* --> 6. Pasar el estado 'paymentMethod' al procesar la venta */}
                  <Button onClick={() => onProcessSale(paymentMethod)} disabled={isLoading} className="flex-1">
                    {isLoading ? "Procesando..." : "Finalizar Venta"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}