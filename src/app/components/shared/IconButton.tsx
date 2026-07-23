import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function IconButton({ label, onClick, className, disabled, children }: {
  label: string;
  onClick: () => void;
  className: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} disabled={disabled} className={className}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
