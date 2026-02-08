"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { UserRole } from "@prisma/client"
import { updateUser } from "@/actions/admin"
import { register } from "@/actions/register"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface User {
// ... existing User interface

  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  permissions: string[];
  activo: boolean;
}

const ALL_PERMISSIONS = [
  { id: "POS", label: "Punto de Venta" },
  { id: "INVENTORY", label: "Inventario (Libros)" },
  { id: "DASHBOARD", label: "Panel de Control" },
  { id: "EXPENSES", label: "Gestión de Gastos" },
  { id: "CANDY", label: "Dulcería" },
  { id: "PENDING", label: "Búsquedas Pendientes" },
  { id: "CASH_CUTS", label: "Cortes de Caja" },
  { id: "APARTADOS", label: "Sistema de Apartados" },
];

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = async (user: User) => {
    // Optimistic update
    setUsers(users.map(u => u.id === user.id ? user : u));
    setEditingUser(null);
    await updateUser(user.id, { 
        rol: user.rol, 
        permissions: user.permissions,
        activo: user.activo
    });
  };

  const handleAdd = (newUser: any) => {
    // Ideally we revalidate or get fresh list, but for UX:
    // setUsers([newUser, ...users]); // Not possible since we don't have ID yet
    setIsAdding(false);
    window.location.reload(); // Quick way to get fresh data
  };

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Gestión de Usuarios</CardTitle>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                </Button>
            </DialogTrigger>
            <CreateUserDialog onAdd={handleAdd} onCancel={() => setIsAdding(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm caption-bottom">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rol</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Permisos</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {users.map((user) => (
                <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">{user.nombre}</td>
                  <td className="p-4 align-middle text-muted-foreground">{user.email}</td>
                  <td className="p-4 align-middle">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      user.rol === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                      user.rol === 'VENDEDOR' ? 'bg-blue-100 text-blue-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                      {user.rol === 'ADMIN' ? (
                          <span className="text-xs text-muted-foreground italic">Acceso Total</span>
                      ) : (
                          <div className="flex flex-wrap gap-1">
                              {user.permissions.length > 0 ? user.permissions.map(p => (
                                  <span key={p} className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-medium text-secondary-foreground">{p}</span>
                              )) : <span className="text-muted-foreground italic text-xs">Sin acceso</span>}
                          </div>
                      )}
                  </td>
                  <td className="p-4 align-middle">
                    <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                          Editar
                        </Button>
                      </DialogTrigger>
                      {editingUser?.id === user.id && (
                          <EditUserDialog user={editingUser} onSave={handleSave} onCancel={() => setEditingUser(null)} />
                      )}
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function EditUserDialog({ user, onSave, onCancel }: { user: User, onSave: (u: User) => void, onCancel: () => void }) {
    const [formData, setFormData] = useState(user);

    const togglePermission = (id: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(id) 
                ? prev.permissions.filter(p => p !== id)
                : [...prev.permissions, id]
        }));
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Usuario: {user.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-3">
                    <Label>Rol del Usuario</Label>
                    <div className="flex gap-2">
                        {(['ADMIN', 'VENDEDOR', 'CONTADOR'] as const).map(role => (
                            <div 
                                key={role}
                                onClick={() => setFormData({...formData, rol: role})}
                                className={`
                                    cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all border
                                    ${formData.rol === role 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                                `}
                            >
                                {role}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label>Permisos de Acceso</Label>
                        {formData.rol === 'ADMIN' && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Acceso Total Habilitado</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.map(permission => {
                            const isSelected = formData.permissions.includes(permission.id) || formData.rol === 'ADMIN';
                            return (
                                <div 
                                    key={permission.id} 
                                    onClick={() => formData.rol !== 'ADMIN' && togglePermission(permission.id)}
                                    className={`
                                        flex items-center space-x-2 p-2 rounded-md transition-all border
                                        ${isSelected
                                            ? 'bg-blue-50 border-blue-200 text-blue-900' 
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'}
                                        ${formData.rol === 'ADMIN' ? 'opacity-60 cursor-default' : 'cursor-pointer'}
                                    `}
                                >
                                    <div className={`
                                        w-4 h-4 rounded-full border flex items-center justify-center
                                        ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}
                                    `}>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-sm font-medium">{permission.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                 <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                        id="activo" 
                        checked={formData.activo}
                        onCheckedChange={(checked) => setFormData({...formData, activo: checked as boolean})}
                    />
                    <Label htmlFor="activo">Usuario Activo</Label>
                </div>

            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button onClick={() => onSave(formData)}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
    )
}

function CreateUserDialog({ onAdd, onCancel }: { onAdd: (u: any) => void, onCancel: () => void }) {
    const [error, setError] = useState("");
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async () => {
        if (!nombre || !email || !password) {
            setError("Todos los campos son obligatorios");
            return;
        }
        
        const res = await register({ nombre, email, password });
        if (res.error) {
            setError(res.error);
        } else {
            onAdd(res.success);
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez" />
                </div>
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@ejemplo.com" />
                </div>
                <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="******" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSubmit}>Crear Usuario</Button>
            </DialogFooter>
        </DialogContent>
    );
}
