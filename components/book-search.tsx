"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Plus, BookOpen } from "lucide-react"

interface Book {
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
  genero: string
}

interface BookSearchProps {
  onSearch: (query: string) => void
  onAddToCart: (book: Book) => void
  isLoading: boolean
}

export function BookSearch({ onSearch, onAddToCart, isLoading }: BookSearchProps) {
  const [query, setQuery] = useState("")
  const [previewBooks, setPreviewBooks] = useState<Book[]>([])
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setPreviewBooks([])
        setShowPreview(false)
        return
      }

      setIsPreviewLoading(true)
      try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        if (response.ok) {
          const books = await response.json()
          setPreviewBooks(books)
          setShowPreview(true)
        }
      } catch (error) {
        console.error("Error searching books:", error)
      } finally {
        setIsPreviewLoading(false)
      }
    }, 300),
    [],
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
      setShowPreview(false)
    }
  }

  const handleAddToCart = (book: Book) => {
    onAddToCart(book)
    setShowPreview(false)
    setQuery("")
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Buscar por título, autor o ISBN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowPreview(true)}
            className="w-full text-base"
          />
          {isPreviewLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <Button type="submit" disabled={isLoading || !query.trim()} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Buscar Todos</span>
        </Button>
      </form>

      {showPreview && previewBooks.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto shadow-lg">
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 px-2">
              Vista previa - {previewBooks.length} resultados
            </div>
            {previewBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                onClick={() => handleAddToCart(book)}
              >
                <div className="w-10 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{book.titulo}</h4>
                  <p className="text-xs text-muted-foreground truncate">{book.autor}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-primary">${book.precio.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">Stock: {book.stock}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showPreview && <div className="fixed inset-0 z-40" onClick={() => setShowPreview(false)} />}
    </div>
  )
}

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
