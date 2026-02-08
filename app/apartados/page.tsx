import { Suspense } from "react"
import { getApartados } from "@/actions/apartados"
import { ApartadosTable } from "@/components/apartados/apartados-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function ApartadosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const status = params.status as any
  const search = params.search
  const page = Number(params.page) || 1
  
  const { apartados, totalCount } = await getApartados({ 
    status, 
    search, 
    limit: 50, 
    offset: (page - 1) * 50 
  })

  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Apartados</h2>
        <div className="flex items-center space-x-2">
          <Link href="/apartados/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Apartado
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="flex flex-col space-y-8">
        <Suspense fallback={<div>Cargando...</div>}>
           <ApartadosTable data={apartados} />
        </Suspense>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
             Total: {totalCount} | Página {page} de {totalPages || 1}
          </div>
          <div className="flex space-x-2">
             <Link 
                href={`/apartados?page=${Math.max(1, page - 1)}${search ? `&search=${search}`: ''}${status ? `&status=${status}` : ''}`}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                passHref
            >
                <Button variant="outline" size="sm" disabled={page <= 1}>Anterior</Button>
            </Link>
             <Link 
                href={`/apartados?page=${Math.min(totalPages, page + 1)}${search ? `&search=${search}`: ''}${status ? `&status=${status}` : ''}`}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                passHref
            >
                <Button variant="outline" size="sm" disabled={page >= totalPages}>Siguiente</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
