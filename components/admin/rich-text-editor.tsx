"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
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
  Minus,
  Plus,
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

  const applyImageWidthStep = useCallback(
    (delta: number) => {
      const next = clampPercent((imageWidthPercent || 100) + delta);
      applyImageWidth(next);
    },
    [applyImageWidth, imageWidthPercent],
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
    <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/80 p-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/65">
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={`h-8 w-8 p-0 ${editor.isActive("bold") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={`h-8 w-8 p-0 ${editor.isActive("italic") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`h-8 w-8 p-0 ${editor.isActive("underline") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} className={`h-8 w-8 p-0 ${editor.isActive("strike") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-slate-200" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`h-8 w-8 p-0 ${editor.isActive("heading", { level: 1 }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`h-8 w-8 p-0 ${editor.isActive("heading", { level: 2 }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`h-8 w-8 p-0 ${editor.isActive("heading", { level: 3 }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-slate-200" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`h-8 w-8 p-0 ${editor.isActive("bulletList") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`h-8 w-8 p-0 ${editor.isActive("orderedList") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-slate-200" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "left" }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "center" }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "right" }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "justify" }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <AlignJustify className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-6 w-px bg-slate-200" />

          <Button type="button" variant="ghost" size="sm" onClick={setLink} className={`h-8 w-8 p-0 ${editor.isActive("link") ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}`}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} disabled={!editor.isActive("link")} className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 disabled:opacity-50">
            <Unlink className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={insertImageByUrl} className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 disabled:opacity-50">
            {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />

          {isEmailMode ? (
            <div className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
              <Variable className="h-4 w-4 text-slate-500" />
              <select
                className="h-8 rounded-md border-none bg-transparent px-2 text-sm text-slate-700 focus:ring-0"
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

          <div className="mx-1 h-6 w-px bg-slate-200" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 disabled:opacity-50">
            <Undo className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 disabled:opacity-50">
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {editor.isActive("image") ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 shadow-sm">
            <span className="text-xs font-medium text-slate-600">Tamaño imagen</span>
            <Button type="button" variant="outline" size="sm" className="h-8 px-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => applyImageWidthStep(-10)}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <input
              type="range"
              min={1}
              max={300}
              value={imageWidthPercent}
              onChange={(event) => applyImageWidth(Number(event.target.value))}
              className="h-2 w-44 cursor-pointer accent-blue-600"
            />
            <Button type="button" variant="outline" size="sm" className="h-8 px-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => applyImageWidthStep(10)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Input
              type="number"
              min={1}
              max={300}
              value={imageWidthPercent}
              onChange={(event) => {
                const rawValue = Number(event.target.value);
                if (!Number.isFinite(rawValue)) return;
                applyImageWidth(rawValue);
              }}
              className="h-8 w-20 bg-white border-slate-200"
            />
            <span className="text-sm text-slate-500">%</span>
            <div className="ml-1 flex items-center gap-1">
              {[50, 75, 100].map((preset) => (
                <Button key={preset} type="button" variant="secondary" size="sm" className="h-7 px-2 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => applyImageWidth(preset)}>
                  {preset}%
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <EditorContent editor={editor} className="prose prose-slate max-w-none p-4 min-h-[300px] focus:outline-none" />
    </div>
  );
}
