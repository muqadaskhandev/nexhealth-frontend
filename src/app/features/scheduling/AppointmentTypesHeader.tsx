type Props = {
  mappingActive?: boolean;
  onMappingRules: () => void;
  onPreview: () => void;
  onTitleClick?: () => void;
};

export function AppointmentTypesHeader({
  mappingActive = false,
  onMappingRules,
  onPreview,
  onTitleClick,
}: Props) {
  const titleCls = "text-2xl font-bold text-gray-900";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
      <div className="min-w-0">
        {onTitleClick ? (
          <button type="button" onClick={onTitleClick} className={`${titleCls} text-left hover:text-teal-700 transition-colors`}>
            Appointment types
          </button>
        ) : (
          <h1 className={titleCls}>Appointment types</h1>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Manage appointments shown in your online booking form.
        </p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 pt-1">
        <button
          type="button"
          onClick={onMappingRules}
          className={`text-sm transition-colors ${
            mappingActive
              ? "font-semibold text-teal-700"
              : "font-medium text-teal-600 hover:text-teal-700"
          }`}
        >
          Mapping rules
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          Preview online booking ↗
        </button>
      </div>
    </div>
  );
}
