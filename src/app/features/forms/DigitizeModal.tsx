import { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "File must be a PDF, JPG, PNG, DOC, or DOCX.";
  }
  if (file.size > MAX_BYTES) {
    return "File must be 10 MB or smaller.";
  }
  return null;
}

export function DigitizeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function pickFile(f: File) {
    const problem = validateFile(f);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (!file) {
      setError("Attach a file to digitize.");
      return;
    }
    if (!name.trim()) {
      setError("Give this form a name.");
      return;
    }
    setSubmitting(true);
    try {
      await staffApi.forms.digitizeTemplate(file, name.trim(), notes.trim());
      toastSuccess("Form submitted for digitization");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not submit this form — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Upload your forms</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></IconButton>
        </div>
        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
          <p className="text-sm text-gray-600">Upload your documents to digitize them. We support PDF, JPG, PNG, DOC, and DOCX files up to 10MB each.</p>

          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) pickFile(f);
            }}
            className={`border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${dragging ? "border-teal-400 bg-teal-50" : file ? "border-teal-400 bg-teal-50/30" : "border-gray-200 bg-gray-50/30"}`}
          >
            {file ? <FileText size={28} className="mx-auto mb-3 text-teal-500" /> : <Upload size={28} className="mx-auto mb-3 text-gray-400" />}
            <p className="text-sm font-semibold text-gray-700 mb-1">{file ? file.name : "Drag and drop files here"}</p>
            {!file && <p className="text-xs text-gray-400 mb-4">or click to browse from your computer</p>}
            {file ? (
              <button onClick={() => setFile(null)} className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors">Remove file</button>
            ) : (
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
                />
                <span className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Select Files</span>
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Patient Intake" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Instructions for our form-building team (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything we should know — e.g. combine with another form, keep the original layout…" className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors ml-auto"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
