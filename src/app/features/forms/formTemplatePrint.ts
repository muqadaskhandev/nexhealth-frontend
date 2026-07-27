import type { FormField, FormTemplate } from "../../types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldPrintHtml(field: FormField): string {
  const label = escapeHtml(field.label);
  const required = field.required ? ' <span style="color:#dc2626">*</span>' : "";
  if (field.type === "content" || field.type === "location_logo") {
    return `<p style="margin:12px 0;color:#374151;white-space:pre-wrap">${label}</p>`;
  }
  if (field.type === "checkbox") {
    return `<label style="display:flex;align-items:center;gap:8px;margin:10px 0;font-size:13px"><span style="display:inline-block;width:14px;height:14px;border:1px solid #ccc"></span>${label}${required}</label>`;
  }
  if (field.type === "textarea") {
    return `<div style="margin:12px 0"><div style="font-weight:600;font-size:13px;margin-bottom:4px">${label}${required}</div><div style="border:1px solid #ddd;height:72px;border-radius:4px"></div></div>`;
  }
  if (field.type === "signature") {
    return `<div style="margin:12px 0"><div style="font-weight:600;font-size:13px;margin-bottom:4px">${label}${required}</div><div style="border:1px dashed #ccc;height:64px;border-radius:4px"></div></div>`;
  }
  if (["select_boxes", "radio", "dropdown"].includes(field.type)) {
    const opts = field.options.length
      ? field.options.map((o) => `<div style="margin:4px 0">○ ${escapeHtml(o)}</div>`).join("")
      : `<div style="color:#9ca3af;font-size:12px">No options</div>`;
    return `<div style="margin:12px 0"><div style="font-weight:600;font-size:13px;margin-bottom:4px">${label}${required}</div>${opts}</div>`;
  }
  return `<div style="margin:12px 0"><div style="font-weight:600;font-size:13px;margin-bottom:4px">${label}${required}</div><div style="border:1px solid #ddd;height:32px;border-radius:4px"></div></div>`;
}

export function openTemplatePrintView(template: FormTemplate) {
  if (template.uploadedFileUrl) {
    window.open(template.uploadedFileUrl, "_blank");
    return;
  }

  const win = window.open("", "_blank");
  if (!win) return;

  const pages = Array.from({ length: template.pageCount }, (_, i) => i + 1);
  const sections = pages
    .map((page) => {
      const fields = template.fields.filter((f) => f.page === page);
      if (fields.length === 0) return "";
      const pageHeader =
        template.pageCount > 1 ? `<h2 style="font-size:14px;margin:24px 0 8px">Page ${page}</h2>` : "";
      return `${pageHeader}${fields.map(fieldPrintHtml).join("")}`;
    })
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(template.name)}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #111; max-width: 720px; margin: 0 auto; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(template.name)}</h1>
        <p class="meta">${escapeHtml(template.documentType)} · ${escapeHtml(template.displayType)}</p>
        ${sections || "<p>This form has no fields yet.</p>"}
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}
