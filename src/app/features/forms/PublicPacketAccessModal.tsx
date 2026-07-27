import { useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { toastSuccess } from "../../lib/toast";
import type { FormPacket } from "../../types";

function buildEmbedScript(url: string, label: string): string {
  return `<script data-label="${label}" type="text/javascript" src="${window.location.origin}/static/js/public_packet.min.js" data-packet-url="${url}"></script>`;
}

export function PublicPacketAccessModal({ packet, onClose }: { packet: FormPacket; onClose: () => void }) {
  const [label, setLabel] = useState("Forms");
  const url = `${window.location.origin}/p/${packet.publicCode}`;
  const embedScript = buildEmbedScript(url, label);

  function copy(text: string, what: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toastSuccess(`${what} copied to clipboard`))
      .catch(() => toastSuccess(text));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">Public packet access</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{packet.name}</p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Packet link</p>
            <input
              readOnly
              value={url}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 outline-none mb-2"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copy(url, "URL")}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700"
              >
                <Copy size={13} /> Copy URL
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700"
              >
                <ExternalLink size={13} /> Preview Link
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Embeddable widget</p>
            <div className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-6 flex items-center justify-center mb-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {label || "Forms"}
              </a>
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Button label"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 mb-2"
            />
            <textarea
              readOnly
              value={embedScript}
              rows={3}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 bg-gray-50 outline-none resize-none mb-2"
            />
            <button
              onClick={() => copy(embedScript, "HTML")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700"
            >
              <Copy size={13} /> Copy HTML
            </button>
          </div>

          <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
            Work with your web developer to add this URL or embed code to your site. Forms completed via a public
            packet link don't sync automatically — review them under the Forms tab's "Pending" list and use{" "}
            <span className="font-semibold">Assign &amp; sync</span> to connect each submission to the right patient.
          </div>
        </div>
      </div>
    </div>
  );
}
