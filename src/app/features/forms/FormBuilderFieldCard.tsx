import { useState } from "react";
import { Copy, GripVertical, Settings, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import type { FormField } from "../../types";
import { FIELD_LABEL, LAYOUT_TYPES } from "./formBuilderConstants";

function FieldCanvasPreview({ field }: { field: FormField }) {
  if (field.type === "content") {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{field.label}</p>;
  }
  if (field.type === "panel") {
    return (
      <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/80">
        <p className="text-sm font-semibold text-gray-800">{field.label || "Panel"}</p>
      </div>
    );
  }
  if (field.type === "columns") {
    return <p className="text-xs text-gray-400 italic">Two-column row — add half-width fields beside each other.</p>;
  }
  if (field.type === "location_logo") {
    return <div className="h-8 w-24 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-400 flex items-center justify-center">Location logo</div>;
  }

  const label = field.label || FIELD_LABEL[field.type];
  return (
    <div className={field.width === "half" ? "" : "w-full"}>
      <label className="block text-sm font-medium text-gray-800 mb-1">
        {label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="h-9 border border-gray-200 rounded-lg bg-gray-50/50" />
    </div>
  );
}

export function FormBuilderFieldCard({
  field,
  onEdit,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  field: FormField;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-nex-form-field-id", field.id);
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative group border rounded-lg p-3 bg-white transition-opacity ${
        isDragging ? "opacity-40 border-dashed border-teal-300" : "border-gray-200"
      } ${field.width === "half" ? "col-span-1" : "col-span-2"}`}
    >
      {(hovered || isDragging) && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 z-10">
          <IconButton label="Edit component" onClick={onEdit} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded">
            <Settings size={14} />
          </IconButton>
          <IconButton label="Drag to reorder" onClick={() => {}} className="w-7 h-7 flex items-center justify-center text-gray-400 cursor-grab rounded">
            <GripVertical size={14} />
          </IconButton>
          <IconButton label="Duplicate" onClick={onDuplicate} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded">
            <Copy size={13} />
          </IconButton>
          <IconButton label="Remove" onClick={onRemove} className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded">
            <X size={14} />
          </IconButton>
        </div>
      )}

      <div className="flex items-start gap-2">
        {!LAYOUT_TYPES.includes(field.type) && (
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide pt-1 flex-shrink-0 w-16 truncate">
            {FIELD_LABEL[field.type]}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <FieldCanvasPreview field={field} />
        </div>
      </div>

      {field.conditionalFieldId && (
        <p className="text-[10px] text-amber-600 mt-2">Conditional field</p>
      )}
      {field.syncTarget && (
        <p className="text-[10px] text-teal-600 mt-1">Syncs to health record</p>
      )}
    </div>
  );
}
