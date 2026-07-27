import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { toastSuccess } from "../../lib/toast";

export function ShareInstructionsModal({ link, embedCode, onClose }: {
  link: string;
  embedCode: string;
  onClose: () => void;
}) {
  const instructions = `Online booking setup instructions for your web developer

1. BASIC LINK (text messages, social bios, simple placements)
   Paste this URL wherever patients should book:
   ${link}

2. CONVERSION ANALYTICS BUTTON (your website)
   Paste this HTML where you want a "Book Now" button. It includes UTM parameters so you can track bookings from your site in analytics tools.
   ${embedCode}

3. TIPS
   • Place the button prominently on your homepage and contact page.
   • For Facebook: add the basic link to your page's Website field.
   • For Instagram: add the basic link in Edit Profile → Website, or use a link-in-bio tool.
   • Test the link after publishing to confirm patients can complete a booking.

4. NEED HELP?
   Contact your NexHealth support team if you want patients redirected back to your website after booking.`;

  function copyInstructions() {
    navigator.clipboard.writeText(instructions);
    toastSuccess("Instructions copied");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Share instructions</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 pb-2 flex-1">
          <p className="text-sm text-gray-600 mb-4">
            Send these instructions to the person who manages your website. They can add your booking link or embed code without needing access to NexHealth.
          </p>
          <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono leading-relaxed">
            {instructions}
          </pre>
        </div>
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={copyInstructions}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Copy instructions
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
