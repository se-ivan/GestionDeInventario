"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { getClientesParaCorreo } from "@/actions/correos";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EmailClient = {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  tipo: string | null;
};

export function EmailCampaignManager() {
  const [clients, setClients] = useState<EmailClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(`
    <div style="text-align: center;">
      <img src="/logoColegioInvisible.svg" alt="El Colegio Invisible" width="200" style="max-width: 100%; height: auto;" />
    </div>
    <p>Hola {{nombre_cliente}},</p>
    <p></p>
  `);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState(bodyHtml);

  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true);
      const result = await getClientesParaCorreo();

      if (!result.success) {
        toast.error(result.error || "No se pudieron cargar los clientes");
        setIsLoadingClients(false);
        return;
      }

      setClients(result.data || []);
      setIsLoadingClients(false);
    };

    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const haystack = `${client.nombre} ${client.email || ""} ${client.tipo || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, searchTerm]);

  const filteredIds = filteredClients.map((client) => client.id);
  const selectedCount = selectedIds.length;
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      const merged = new Set([...selectedIds, ...filteredIds]);
      setSelectedIds(Array.from(merged));
      return;
    }

    const filteredSet = new Set(filteredIds);
    setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return [...prev, id];
      return prev.filter((value) => value !== id);
    });
  };

  const sendCampaign = async () => {
    if (!subject.trim()) {
      toast.error("El asunto es obligatorio");
      return;
    }

    if (!bodyHtml.trim()) {
      toast.error("El cuerpo del correo es obligatorio");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un cliente");
      return;
    }

    const recipients = clients
      .filter((client) => selectedIds.includes(client.id) && client.email)
      .map((client) => ({
        id: client.id,
        nombre: client.nombre,
        email: client.email as string,
        telefono: client.telefono,
        tipo: client.tipo,
      }));

    if (recipients.length === 0) {
      toast.error("Los clientes seleccionados no tienen email válido");
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch("/api/correos/enviar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          html: bodyHtml,
          recipients,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        toast.error(payload?.error || "No se pudo enviar la campaña");
        return;
      }

      toast.success(`Campaña enviada: ${payload.sentCount} correos`);

      if (payload.failedCount > 0) {
        toast.error(`Fallaron ${payload.failedCount} correos`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error inesperado al enviar correos");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="xl:sticky xl:top-6 xl:h-[calc(100vh-7rem)]">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5" />
            Destinatarios
          </CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, email o tipo"
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <Checkbox checked={allFilteredSelected} onCheckedChange={(checked) => toggleSelectAllFiltered(Boolean(checked))} />
              Seleccionar todos
            </label>
            <span>{selectedCount} seleccionados</span>
          </div>
        </CardHeader>
        <CardContent className="max-h-[60vh] overflow-auto">
          {isLoadingClients ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Sel</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(client.id)} onCheckedChange={(checked) => toggleOne(client.id, Boolean(checked))} />
                    </TableCell>
                    <TableCell>{client.nombre}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{client.email}</TableCell>
                    <TableCell>{client.tipo || "-"}</TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay clientes que coincidan con la búsqueda
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-xl">Redacción de campaña</CardTitle>
          <div className="space-y-2">
            <Label htmlFor="email-subject">Asunto</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Asunto del correo"
            />
            <p className="text-xs text-muted-foreground">
              Variables disponibles: {"{{nombre_cliente}}"}, {"{{email_cliente}}"}, {"{{telefono_cliente}}"}, {"{{tipo_cliente}}"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichTextEditor
            content={bodyHtml}
            mode="email"
            onChange={setBodyHtml}
            onEmailHtmlChange={setEmailPreviewHtml}
            variableTokens={["nombre_cliente", "email_cliente", "telefono_cliente", "tipo_cliente"]}
          />

          <details className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">Vista de HTML inline (modo correo)</summary>
            <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {emailPreviewHtml}
            </pre>
          </details>

          <Button onClick={sendCampaign} disabled={isSending || isLoadingClients} className="w-full">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Enviar campaña
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
