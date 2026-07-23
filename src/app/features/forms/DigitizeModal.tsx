import { useState } from "react";
import { X, Upload } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";

export function DigitizeModal({ onClose }: { onClose: () => void }) {
  const [hasFile, setHasFile] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-gray-900">Upload your forms</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></IconButton>
        </div>
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-gray-600">Upload your documents to digitize them. We support PDF, JPG, PNG, DOC, and DOCX files up to 10MB each.</p>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); setHasFile(true); }}
            className={`border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${dragging ? "border-teal-400 bg-teal-50" : hasFile ? "border-teal-400 bg-teal-50/30" : "border-gray-200 bg-gray-50/30"}`}
          >
            <Upload size={28} className={`mx-auto mb-3 ${hasFile ? "text-teal-500" : "text-gray-400"}`} />
            <p className="text-sm font-semibold text-gray-700 mb-1">{hasFile ? "File ready to upload" : "Drag and drop files here"}</p>
            {!hasFile && <p className="text-xs text-gray-400 mb-4">or click to browse from your computer</p>}
            {!hasFile && (
              <label className="inline-block cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={() => setHasFile(true)} />
                <span className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Select Files</span>
              </label>
            )}
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
            <button
              disabled={!hasFile}
              onClick={onClose}
              className={`px-5 py-2 text-sm font-medium border rounded-lg transition-colors ml-auto ${hasFile ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-300 cursor-not-allowed"}`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
