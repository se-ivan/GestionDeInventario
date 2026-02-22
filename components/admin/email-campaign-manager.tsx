"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mail, Save, Search } from "lucide-react";
import type { EditorRef, EmailEditorProps } from "react-email-editor";
import { toast } from "sonner";
import { getClientesParaCorreo, getEmailTemplates, saveEmailTemplate } from "@/actions/correos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

type EmailClient = {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  tipo: string | null;
};

type EmailTemplate = {
  id: number;
  nombre: string;
  subject: string | null;
  html: string;
  design: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type ExportedEmailData = {
  html: string;
  design: unknown;
};

type SendResponsePayload = {
  success: boolean;
  message?: string;
  error?: string;
  sentCount?: number;
  failedCount?: number;
  failed?: Array<{ email: string; error: string }>;
};

type SendResultModal = {
  open: boolean;
  title: string;
  description: string;
  sentCount: number;
  failedCount: number;
  failed: Array<{ email: string; error: string }>;
};

const defaultDesign = {
  body: {
    rows: [
      {
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: "image",
                values: {
                  src: {
                    url: "/logoColegioInvisible-dark.svg",
                  },
                  altText: "El Colegio Invisible",
                  textAlign: "center",
                  width: "45%",
                },
              },
              {
                type: "text",
                values: {
                  text: "<p>Hola {{nombre_cliente}},</p><p>Te compartimos nuestras novedades.</p>",
                },
              },
            ],
          },
        ],
      },
    ],
    values: {
      backgroundColor: "#f8fafc",
      contentWidth: "680px",
    },
  },
  counters: {
    u_column: 1,
    u_row: 1,
    u_content_text: 1,
    u_content_image: 1,
  },
  schemaVersion: 15,
} as const;

const unlayerOptions: EmailEditorProps["options"] = {
  displayMode: "email",
  mergeTags: {
    nombre_cliente: {
      name: "Nombre del cliente",
      value: "{{nombre_cliente}}",
    },
    email_cliente: {
      name: "Email del cliente",
      value: "{{email_cliente}}",
    },
    telefono_cliente: {
      name: "Teléfono del cliente",
      value: "{{telefono_cliente}}",
    },
    tipo_cliente: {
      name: "Tipo de cliente",
      value: "{{tipo_cliente}}",
    },
  },
  appearance: {
    theme: "light",
    panels: {
      tools: {
        dock: "left",
      },
    },
  },
};

export function EmailCampaignManager() {
  const editorRef = useRef<EditorRef>(null);

  const [activeTab, setActiveTab] = useState<"design" | "send">("design");
  const [clients, setClients] = useState<EmailClient[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [designSubject, setDesignSubject] = useState("");
  const [designTemplateId, setDesignTemplateId] = useState<string>("new");

  const [sendTemplateId, setSendTemplateId] = useState<string>("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendPreviewHtml, setSendPreviewHtml] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sendResultModal, setSendResultModal] = useState<SendResultModal>({
    open: false,
    title: "",
    description: "",
    sentCount: 0,
    failedCount: 0,
    failed: [],
  });

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const haystack = `${client.nombre} ${client.email || ""} ${client.tipo || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, searchTerm]);

  const filteredIds = filteredClients.map((client) => client.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const getTemplateById = (id: string) => templates.find((template) => template.id === Number(id));

  const loadInitialData = async () => {
    setIsLoadingClients(true);
    setIsLoadingTemplates(true);

    const [clientsResult, templatesResult] = await Promise.all([getClientesParaCorreo(), getEmailTemplates()]);

    if (!clientsResult.success) {
      toast.error(clientsResult.error || "No se pudieron cargar los clientes");
    } else {
      setClients((clientsResult.data || []) as EmailClient[]);
    }

    if (!templatesResult.success) {
      toast.error(templatesResult.error || "No se pudieron cargar las plantillas");
    } else {
      const loadedTemplates = (templatesResult.data || []) as EmailTemplate[];
      setTemplates(loadedTemplates);
      if (loadedTemplates.length > 0) {
        const firstId = String(loadedTemplates[0].id);
        setSendTemplateId(firstId);
        setSendSubject(loadedTemplates[0].subject || "");
        setSendPreviewHtml(loadedTemplates[0].html || "");
      }
    }

    setIsLoadingClients(false);
    setIsLoadingTemplates(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const exportHtmlFromEditor = () =>
    new Promise<ExportedEmailData>((resolve, reject) => {
      const editor = editorRef.current?.editor;
      if (!editor) {
        reject(new Error("Editor no disponible"));
        return;
      }
      editor.exportHtml((data: { html: string; design: unknown }) => {
        resolve({ html: data.html, design: data.design });
      });
    });

  const onEditorReady = () => {
    if (designTemplateId === "new") {
      editorRef.current?.editor?.loadDesign(defaultDesign as unknown as object);
      return;
    }

    const selected = getTemplateById(designTemplateId);
    if (selected?.design) {
      editorRef.current?.editor?.loadDesign(selected.design as object);
    }
  };

  const onChangeDesignTemplate = (value: string) => {
    setDesignTemplateId(value);

    if (value === "new") {
      setTemplateName("");
      setDesignSubject("");
      editorRef.current?.editor?.loadDesign(defaultDesign as unknown as object);
      return;
    }

    const selected = getTemplateById(value);
    if (!selected) return;

    setTemplateName(selected.nombre || "");
    setDesignSubject(selected.subject || "");

    if (selected.design) {
      editorRef.current?.editor?.loadDesign(selected.design as object);
    }
  };

  const onChangeSendTemplate = (value: string) => {
    setSendTemplateId(value);
    const selected = getTemplateById(value);
    if (!selected) return;
    setSendSubject(selected.subject || "");
    setSendPreviewHtml(selected.html || "");
  };

  const refreshDesignPreview = async () => {
    try {
      const { html } = await exportHtmlFromEditor();
      setSendPreviewHtml(html);
      toast.success("Vista previa actualizada");
    } catch {
      toast.error("No se pudo actualizar la vista previa");
    }
  };

  const saveTemplateFromDesigner = async () => {
    if (!templateName.trim()) {
      toast.error("Ingresa el nombre de la plantilla");
      return;
    }

    try {
      setIsSavingTemplate(true);
      const { html, design } = await exportHtmlFromEditor();

      const result = await saveEmailTemplate({
        nombre: templateName.trim(),
        subject: designSubject.trim(),
        html,
        design,
      });

      if (!result.success) {
        toast.error(result.error || "No se pudo guardar la plantilla");
        return;
      }

      toast.success("Plantilla guardada correctamente");
      await loadInitialData();

      const createdId = String((result.data as EmailTemplate)?.id || "");
      if (createdId) {
        setDesignTemplateId(createdId);
        setSendTemplateId(createdId);
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar la plantilla");
    } finally {
      setIsSavingTemplate(false);
    }
  };

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
    if (!sendTemplateId) {
      toast.error("Selecciona una plantilla guardada para enviar");
      return;
    }

    const selectedTemplate = getTemplateById(sendTemplateId);
    if (!selectedTemplate?.html?.trim()) {
      toast.error("La plantilla seleccionada no tiene HTML válido");
      return;
    }

    if (!sendSubject.trim()) {
      toast.error("El asunto es obligatorio");
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
          subject: sendSubject,
          html: selectedTemplate.html,
          recipients,
        }),
      });

      const payload = (await response.json()) as SendResponsePayload;

      const sentCount = payload.sentCount || 0;
      const failedCount = payload.failedCount || 0;
      const failed = payload.failed || [];

      if (!response.ok) {
        const errorMessage = payload?.error || payload?.message || "No se pudo enviar la campaña";
        setSendResultModal({
          open: true,
          title: "Error al enviar campaña",
          description: errorMessage,
          sentCount,
          failedCount,
          failed,
        });
        return;
      }

      const title = failedCount > 0 ? "Campaña enviada parcialmente" : "Campaña enviada exitosamente";
      const description = payload.message || `Se enviaron ${sentCount} correos${failedCount > 0 ? ` y fallaron ${failedCount}` : ""}.`;

      setSendResultModal({
        open: true,
        title,
        description,
        sentCount,
        failedCount,
        failed,
      });

      if (failedCount === 0) {
        toast.success(`Campaña enviada: ${sentCount} correos`);
      } else {
        toast.error(`Envío parcial: ${sentCount} enviados, ${failedCount} fallidos`);
      }
    } catch (error) {
      console.error(error);
      setSendResultModal({
        open: true,
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al enviar correos.",
        sentCount: 0,
        failedCount: 0,
        failed: [],
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "design" | "send")} className="space-y-4">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="design">Diseñador de Plantillas</TabsTrigger>
        <TabsTrigger value="send">Envío de Campañas</TabsTrigger>
      </TabsList>

      <TabsContent value="design" className="space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl">Diseñador Unlayer (ventana completa)</CardTitle>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="design-template-select">Plantilla</Label>
                <Select value={designTemplateId} onValueChange={onChangeDesignTemplate}>
                  <SelectTrigger id="design-template-select">
                    <SelectValue placeholder={isLoadingTemplates ? "Cargando plantillas..." : "Selecciona plantilla"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nueva plantilla</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="template-name">Nombre de plantilla</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Ej: Bienvenida clientes"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="design-subject">Asunto por defecto</Label>
                <Input
                  id="design-subject"
                  value={designSubject}
                  onChange={(event) => setDesignSubject(event.target.value)}
                  placeholder="Asunto sugerido"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Variables disponibles: {"{{nombre_cliente}}"}, {"{{email_cliente}}"}, {"{{telefono_cliente}}"}, {"{{tipo_cliente}}"}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-md border bg-background">
              <EmailEditor ref={editorRef} onReady={onEditorReady} minHeight="72vh" options={unlayerOptions} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={refreshDesignPreview}>
                Vista previa rápida
              </Button>
              <Button type="button" variant="secondary" onClick={saveTemplateFromDesigner} disabled={isSavingTemplate}>
                {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar plantilla
              </Button>
            </div>

            <details className="rounded-md border bg-muted/10 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">Vista previa del diseño actual</summary>
              <div className="mt-3 overflow-hidden rounded-md border bg-white">
                <iframe title="Vista previa diseño" srcDoc={sendPreviewHtml} className="h-[420px] w-full" sandbox="" />
              </div>
            </details>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="send" className="space-y-4">
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
                <span>{selectedIds.length} seleccionados</span>
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
              <CardTitle className="text-xl">Seleccionar plantilla guardada</CardTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="send-template-select">Plantilla</Label>
                  <Select value={sendTemplateId} onValueChange={onChangeSendTemplate}>
                    <SelectTrigger id="send-template-select">
                      <SelectValue placeholder={isLoadingTemplates ? "Cargando plantillas..." : "Selecciona plantilla guardada"} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="send-subject">Asunto</Label>
                  <Input
                    id="send-subject"
                    value={sendSubject}
                    onChange={(event) => setSendSubject(event.target.value)}
                    placeholder="Asunto del correo"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-md border bg-white">
                <iframe title="Vista previa plantilla seleccionada" srcDoc={sendPreviewHtml} className="h-[500px] w-full" sandbox="" />
              </div>

              <Button onClick={sendCampaign} disabled={isSending || isLoadingClients || isLoadingTemplates} className="w-full">
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Enviar campaña
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>

      <Dialog open={sendResultModal.open} onOpenChange={(open) => setSendResultModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{sendResultModal.title}</DialogTitle>
            <DialogDescription>{sendResultModal.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-emerald-50 px-3 py-2 text-emerald-700">
                <p className="text-xs uppercase tracking-wide">Enviados</p>
                <p className="text-lg font-semibold">{sendResultModal.sentCount}</p>
              </div>
              <div className="rounded-md border bg-rose-50 px-3 py-2 text-rose-700">
                <p className="text-xs uppercase tracking-wide">Fallidos</p>
                <p className="text-lg font-semibold">{sendResultModal.failedCount}</p>
              </div>
            </div>

            {sendResultModal.failed.length > 0 ? (
              <div className="max-h-56 overflow-auto rounded-md border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendResultModal.failed.map((item, index) => (
                      <tr key={`${item.email}-${index}`} className="border-t">
                        <td className="px-3 py-2">{item.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={() => setSendResultModal((prev) => ({ ...prev, open: false }))}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
