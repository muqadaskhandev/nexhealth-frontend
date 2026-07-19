import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host — teal accents to match NextHealth UI (Save buttons, focus rings).
 * Mount once near the root so auth pages and the main shell share the same feedback.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      closeButton
      richColors={false}
      gap={10}
      offset={16}
      duration={3500}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-white !text-gray-900 !border !border-gray-200 !shadow-lg !rounded-xl !font-sans",
          title: "!text-sm !font-semibold !text-gray-900",
          description: "!text-xs !text-gray-500",
          closeButton:
            "!bg-white !border-gray-200 !text-gray-500 hover:!bg-gray-50",
          success: "!border-teal-200",
          error: "!border-red-200",
          actionButton: "!bg-teal-500 !text-white",
          cancelButton: "!bg-gray-100 !text-gray-700",
        },
      }}
      {...props}
    />
  );
}
