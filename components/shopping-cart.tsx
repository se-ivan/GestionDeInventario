"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Minus, Plus, Trash2 } from "lucide-react"

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
  onProcessSale: () => void
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
              {items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{item.titulo}</h4>
                      <p className="text-xs text-muted-foreground">{item.autor}</p>
                      <p className="text-sm font-semibold text-primary mt-1">${item.precio.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>

                      <Input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => {
                          const value = Number.parseInt(e.target.value) || 1
                          onUpdateQuantity(item.id, Math.min(value, item.stock))
                        }}
                        className="w-16 text-center"
                      />

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>

                      <Button size="sm" variant="destructive" onClick={() => onUpdateQuantity(item.id, 0)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="font-semibold">${(item.precio * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold mb-4">
                  <span>Total:</span>
                  <span className="text-primary">${getTotalAmount().toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                    Continuar Comprando
                  </Button>
                  <Button onClick={onProcessSale} disabled={isLoading} className="flex-1">
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
