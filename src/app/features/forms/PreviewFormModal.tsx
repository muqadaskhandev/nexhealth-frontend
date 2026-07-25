import { useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import type { FormField, FormTemplate } from "../../types";

function FieldPreview({ field }: { field: FormField }) {
  const label = (
    <label className="block text-sm font-medium text-gray-800 mb-1.5">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </label>
  );
  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50";

  switch (field.type) {
    case "textarea":
      return <div>{label}<textarea disabled rows={3} className={`${inputCls} resize-none`} /></div>;
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-not-allowed">
          <input type="checkbox" disabled />
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
      );
    case "select_boxes":
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.length === 0 ? (
              <p className="text-xs text-gray-400">No options added</p>
            ) : field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed">
                <input type="checkbox" disabled /> {opt}
              </label>
            ))}
          </div>
        </div>
      );
    case "dropdown":
      return (
        <div>
          {label}
          <select disabled className={inputCls}>
            <option>{field.options[0] ?? "—"}</option>
            {field.options.slice(1).map((opt, i) => <option key={i}>{opt}</option>)}
          </select>
        </div>
      );
    case "signature":
      return (
        <div>
          {label}
          <div className="border border-dashed border-gray-300 rounded-lg h-16 flex items-center justify-center text-xs text-gray-400 bg-gray-50">
            Signature
          </div>
        </div>
      );
    case "date":
      return <div>{label}<input disabled type="date" className={inputCls} /></div>;
    case "email":
      return <div>{label}<input disabled type="email" className={inputCls} /></div>;
    case "number":
      return <div>{label}<input disabled type="number" className={inputCls} /></div>;
    case "phone":
      return <div>{label}<input disabled type="tel" className={inputCls} /></div>;
    default:
      return <div>{label}<input disabled type="text" className={inputCls} /></div>;
  }
}

export function PreviewFormModal({ template, onClose }: { template: FormTemplate; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const isWizard = template.displayType === "wizard" && template.pageCount > 1;
  const pages = isWizard
    ? [page]
    : Array.from({ length: template.pageCount }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{template.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Preview — this is what a patient would see</p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-5">
          {template.status === "digitizing" ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
              This form is still being converted by our team — no preview available yet.
            </p>
          ) : template.fields.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
              This form doesn't have any questions yet.
            </p>
          ) : (
            pages.map((p) => (
              <div key={p} className="space-y-4">
                {template.pageCount > 1 && !isWizard && (
                  <p className="text-xs font-semibold text-gray-500 pt-2 first:pt-0">Page {p}</p>
                )}
                {template.fields.filter((f) => f.page === p).map((f) => (
                  <FieldPreview key={f.id} field={f} />
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {isWizard && template.status !== "digitizing" && template.fields.length > 0 && (
            <div className="flex items-center gap-2 mr-auto">
              <IconButton label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeft size={14} />
              </IconButton>
              <span className="text-xs text-gray-500">Page {page} of {template.pageCount}</span>
              <IconButton label="Next page" onClick={() => setPage((p) => Math.min(template.pageCount, p + 1))} disabled={page === template.pageCount} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowRight size={14} />
              </IconButton>
            </div>
          )}
          <button onClick={onClose} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors ml-auto">
            Exit preview
          </button>
        </div>
      </div>
    </div>
  );
}
