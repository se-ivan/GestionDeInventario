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
  { id: "INVENTORY", label: "Inventario" },
  { id: "DASHBOARD", label: "Panel de Control" },
  { id: "EXPENSES", label: "Gastos" },
  { id: "CANDY", label: "Dulcería" },
  { id: "PENDING", label: "Pendientes" },
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                </Button>
            </DialogTrigger>
            <CreateUserDialog onAdd={handleAdd} onCancel={() => setIsAdding(false)} />
        </Dialog>
      </div>
      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Rol</th>
              <th className="p-3 text-left">Permisos</th>
              <th className="p-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50/50">
                <td className="p-3">{user.nombre}</td>
                <td className="p-3 text-gray-500">{user.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.rol === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                    user.rol === 'VENDEDOR' ? 'bg-blue-100 text-blue-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {user.rol}
                  </span>
                </td>
                <td className="p-3">
                    {user.rol === 'ADMIN' ? (
                         <span className="text-xs text-gray-400">Acceso Total</span>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {user.permissions.length > 0 ? user.permissions.map(p => (
                                <span key={p} className="bg-gray-100 px-1 rounded text-xs">{p}</span>
                            )) : <span className="text-gray-400 italic">Sin acceso</span>}
                        </div>
                    )}
                </td>
                <td className="p-3">
                  <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
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
    </div>
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
                <div className="space-y-2">
                    <Label>Rol</Label>
                    <div className="flex gap-4">
                        {(['ADMIN', 'VENDEDOR', 'CONTADOR'] as const).map(role => (
                            <div key={role} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={role} 
                                    checked={formData.rol === role}
                                    onCheckedChange={() => setFormData({...formData, rol: role})}
                                />
                                <label htmlFor={role} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {role}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Permisos (Solo para No-Admins)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {ALL_PERMISSIONS.map(permission => (
                            <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={permission.id} 
                                    checked={formData.permissions.includes(permission.id)}
                                    // if admin, disable or force checked? Usually admin has all.
                                    disabled={formData.rol === 'ADMIN'}
                                    onCheckedChange={() => togglePermission(permission.id)}
                                />
                                <Label htmlFor={permission.id} className={formData.rol === 'ADMIN' ? 'text-gray-400' : ''}>
                                    {permission.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                    {formData.rol === 'ADMIN' && <p className="text-xs text-muted-foreground">Los administradores tienen acceso total.</p>}
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
