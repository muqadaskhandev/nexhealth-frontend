import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";

const FORM_TEMPLATES = [
  "Patient Intake Form", "Medical History", "HIPAA Consent",
  "Insurance Authorization", "Dental History", "COVID Screening",
];

export function FormBuilderView({ onExit }: { onExit: () => void }) {
  const [title, setTitle] = useState("New Form Title");
  const [template, setTemplate] = useState("");
  const [docType, setDocType] = useState("");
  const [displayType, setDisplayType] = useState("Wizard");
  const [pages, setPages] = useState(["Page 1"]);

  const QUESTIONS = [
    { icon: ">_", label: "Text Field" },
    { icon: "A",  label: "Text Area" },
    { icon: "@",  label: "Email" },
    { icon: "#",  label: "Number" },
    { icon: "☎",  label: "Phone Number" },
    { icon: "☑",  label: "Checkbox" },
    { icon: "⊞",  label: "Select Boxes" },
    { icon: "▾",  label: "Dropdown" },
    { icon: "✎",  label: "Signature" },
    { icon: "📅", label: "Date" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">Form Builder</h2>
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save and exit</button>
          <IconButton label="Close" onClick={onExit} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"><X size={15} /></IconButton>
        </div>
      </div>

      {/* Config row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-gray-50/50 flex-shrink-0 flex-wrap">
        <div className="relative">
          <select value={template} onChange={e => setTemplate(e.target.value)} className="pl-3 pr-8 py-1.5 border border-red-400 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[180px] focus:ring-2 focus:ring-red-100">
            <option value="">Select a Template</option>
            {FORM_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={docType} onChange={e => setDocType(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[150px] focus:border-teal-400">
            <option value="">Document Type</option>
            <option>Medical</option><option>Dental</option><option>Insurance</option><option>Consent</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Display Type</span>
          <div className="relative">
            <select value={displayType} onChange={e => setDisplayType(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none focus:border-teal-400">
              <option>Wizard</option><option>Single Page</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Title</span>
          <input value={title} onChange={e => setTitle(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white min-w-[160px]" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Questions sidebar */}
        <div className="w-48 border-r border-border bg-white flex-shrink-0 overflow-y-auto">
          <p className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-border">Questions</p>
          {QUESTIONS.map(q => (
            <button key={q.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing">
              <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
              {q.label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 overflow-y-auto">
          {/* Page tabs */}
          <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-border">
            {pages.map((page, i) => (
              <button key={i} className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white">{page}</button>
            ))}
            <button onClick={() => setPages(p => [...p, `Page ${p.length + 1}`])} className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors px-2">
              <span className="text-base leading-none">+</span> Page
            </button>
          </div>

          {/* Drop zones */}
          <div className="p-6 space-y-4">
            {pages.map((page, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-gray-600 mb-2">{page}</p>
                <div className="bg-white rounded-xl border border-border p-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg px-6 py-10 text-center text-sm text-gray-400">
                    Drag and Drop a form component
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
