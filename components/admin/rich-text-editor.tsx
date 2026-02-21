"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImageFromClient } from "@/lib/media-upload";
import { convertEditorHtmlToEmailHtml } from "@/lib/emailHtml";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
  Upload,
  Variable,
} from "lucide-react";
import { toast } from "sonner";

type EditorMode = "news" | "email";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  mode?: EditorMode;
  onEmailHtmlChange?: (emailHtml: string) => void;
  variableTokens?: string[];
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("data-width") || element.style.width || "100%",
        renderHTML: (attributes) => ({
          "data-width": attributes.width,
          style: `width: ${attributes.width}; max-width: 100%; height: auto; display: block;`,
        }),
      },
    };
  },
});

const clampPercent = (value: number) => Math.min(300, Math.max(1, value));

const parseWidthPercent = (value: string | null | undefined) => {
  const numeric = Number.parseFloat((value || "").replace("%", ""));
  if (!Number.isFinite(numeric)) return 100;
  return clampPercent(Math.round(numeric));
};

export function RichTextEditor({
  content,
  onChange,
  mode = "news",
  onEmailHtmlChange,
  variableTokens = ["nombre_cliente", "email_cliente", "telefono_cliente", "tipo_cliente"],
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageWidthPercent, setImageWidthPercent] = useState(100);

  const isEmailMode = mode === "email";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      ResizableImage,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    parseOptions: {
      preserveWhitespace: "full",
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      onChange(html);
      if (isEmailMode && onEmailHtmlChange) {
        onEmailHtmlChange(convertEditorHtmlToEmailHtml(html));
      }
    },
    editorProps: {
      transformPastedHTML: (html) =>
        html
          .replace(/<\/?o:p>/gi, "")
          .replace(/\sclass=("|')?Mso[^\s>]*("|')?/gi, "")
          .replace(/\smso-[^:;"']+:[^;"']+;?/gi, ""),
      attributes: {
        class:
          "rich-text-editor-content prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[320px] p-4 border-0 bg-background",
      },
    },
  });

  const selectedImageWidth = useMemo(() => {
    if (!editor?.isActive("image")) return 100;
    return parseWidthPercent(editor.getAttributes("image").width);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const updateImageWidth = () => {
      if (editor.isActive("image")) {
        setImageWidthPercent(parseWidthPercent(editor.getAttributes("image").width));
      }
    };

    updateImageWidth();
    editor.on("selectionUpdate", updateImageWidth);
    editor.on("transaction", updateImageWidth);

    return () => {
      editor.off("selectionUpdate", updateImageWidth);
      editor.off("transaction", updateImageWidth);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content || "<p></p>", { emitUpdate: false });
      if (isEmailMode && onEmailHtmlChange) {
        onEmailHtmlChange(convertEditorHtmlToEmailHtml(content || "<p></p>"));
      }
    }
  }, [content, editor, isEmailMode, onEmailHtmlChange]);

  const applyImageWidth = useCallback(
    (value: number) => {
      if (!editor || !editor.isActive("image")) return;
      const safe = clampPercent(value);
      setImageWidthPercent(safe);
      editor.chain().focus().updateAttributes("image", { width: `${safe}%` }).run();
    },
    [editor],
  );

  const insertImageByUrl = useCallback(() => {
    const url = window.prompt("URL de la imagen:");
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).updateAttributes("image", { width: "100%" }).run();
    setImageWidthPercent(100);
  }, [editor]);

  const uploadImage = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editor) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Selecciona un archivo de imagen válido");
        return;
      }

      try {
        setIsUploadingImage(true);
        const src = await uploadImageFromClient(file);
        editor.chain().focus().setImage({ src }).updateAttributes("image", { width: "100%" }).run();
        setImageWidthPercent(100);
        toast.success("Imagen insertada");
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar la imagen");
      } finally {
        setIsUploadingImage(false);
        event.target.value = "";
      }
    },
    [editor],
  );

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertVariable = useCallback(
    (token: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${token}}}`).run();
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="w-full overflow-hidden rounded-md border bg-background">
      <div className="sticky top-0 z-20 border-b bg-muted/80 p-2 backdrop-blur supports-[backdrop-filter]:bg-muted/65">
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "bg-muted" : ""}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "bg-muted" : ""}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? "bg-muted" : ""}>
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive("strike") ? "bg-muted" : ""}>
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-border" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}>
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}>
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}>
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-border" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "bg-muted" : ""}>
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "bg-muted" : ""}>
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-border" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={editor.isActive({ textAlign: "left" }) ? "bg-muted" : ""}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={editor.isActive({ textAlign: "center" }) ? "bg-muted" : ""}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={editor.isActive({ textAlign: "right" }) ? "bg-muted" : ""}>
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={editor.isActive({ textAlign: "justify" }) ? "bg-muted" : ""}>
            <AlignJustify className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-border" />

          <Button type="button" variant="ghost" size="sm" onClick={setLink} className={editor.isActive("link") ? "bg-muted" : ""}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} disabled={!editor.isActive("link")}>
            <Unlink className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={insertImageByUrl}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
            {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />

          {isEmailMode ? (
            <div className="ml-auto flex items-center gap-2 rounded-md border bg-background px-2 py-1">
              <Variable className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                defaultValue=""
                onChange={(event) => {
                  const token = event.target.value;
                  if (!token) return;
                  insertVariable(token);
                  event.target.value = "";
                }}
              >
                <option value="">Insertar variable</option>
                {variableTokens.map((token) => (
                  <option key={token} value={token}>
                    {`{{${token}}}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mx-1 h-6 w-px bg-border" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {editor.isActive("image") ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-2">
            <span className="text-xs text-muted-foreground">Tamaño imagen</span>
            <input
              type="range"
              min={1}
              max={300}
              value={imageWidthPercent || selectedImageWidth}
              onChange={(event) => applyImageWidth(Number(event.target.value))}
              className="h-2 w-44 cursor-pointer"
            />
            <Input
              type="number"
              min={1}
              max={300}
              value={imageWidthPercent || selectedImageWidth}
              onChange={(event) => applyImageWidth(Number(event.target.value || 100))}
              className="h-8 w-20"
            />
            <span className="text-sm">%</span>
          </div>
        ) : null}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
