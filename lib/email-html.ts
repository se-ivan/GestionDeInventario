const TAG_STYLES: Record<string, string> = {
  p: "margin:0 0 16px 0; line-height:1.6; font-size:16px; color:#0f172a;",
  h1: "margin:0 0 16px 0; line-height:1.3; font-size:32px; font-weight:700; color:#0f172a;",
  h2: "margin:0 0 14px 0; line-height:1.35; font-size:26px; font-weight:700; color:#0f172a;",
  h3: "margin:0 0 12px 0; line-height:1.4; font-size:22px; font-weight:700; color:#0f172a;",
  ul: "margin:0 0 16px 20px; padding:0; line-height:1.6;",
  ol: "margin:0 0 16px 20px; padding:0; line-height:1.6;",
  li: "margin:0 0 6px 0;",
  a: "color:#2563eb; text-decoration:underline;",
  blockquote: "margin:0 0 16px 0; padding:12px 16px; border-left:4px solid #cbd5e1; color:#334155; background:#f8fafc;",
  img: "display:block; height:auto; border:0; max-width:100%;",
  strong: "font-weight:700;",
  em: "font-style:italic;",
  u: "text-decoration:underline;",
  s: "text-decoration:line-through;",
};

function mergeStyle(existing: string | undefined, incoming: string) {
  return [existing || "", incoming].filter(Boolean).join(" ").trim();
}

function applyInlineStyles(html: string) {
  return Object.entries(TAG_STYLES).reduce((result, [tag, style]) => {
    const regex = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
    return result.replace(regex, (full, attrs = "") => {
      if (/style\s*=\s*['\"]/i.test(attrs)) {
        return full.replace(/style\s*=\s*(['\"])(.*?)\1/i, (_match, quote, currentStyle) => {
          const merged = mergeStyle(currentStyle, style);
          return `style=${quote}${merged}${quote}`;
        });
      }
      return `<${tag}${attrs} style="${style}">`;
    });
  }, html);
}

export function convertEditorHtmlToEmailHtml(html: string) {
  const normalized = (html || "<p></p>")
    .replace(/\sclass=("|')[^"']*("|')/gi, "")
    .replace(/\sdata-[a-z-]+=("|')[^"']*("|')/gi, "");

  const inlineStyled = applyInlineStyles(normalized);

  return `
  <div style="font-family:Arial,Helvetica,sans-serif; background:#ffffff; color:#0f172a; margin:0; padding:0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; width:100%;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="border-collapse:collapse; width:100%; max-width:680px;">
            <tr>
              <td style="font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#0f172a;">
                ${inlineStyled}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `.trim();
}

export function replaceTemplateVariables(template: string, variables: Record<string, string | number | null | undefined>) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_full, variableName: string) => {
    const value = variables[variableName];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}
