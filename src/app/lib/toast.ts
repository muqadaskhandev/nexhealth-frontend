import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { createElement } from "react";

/** Success toast — create / update / delete confirmations. */
export function toastSuccess(message: string) {
  toast.success(message, {
    icon: createElement(CheckCircle2, { size: 18, className: "text-teal-500" }),
  });
}

/** Error toast for failed mutations. */
export function toastError(message: string) {
  toast.error(message, {
    icon: createElement(XCircle, { size: 18, className: "text-red-500" }),
  });
}
