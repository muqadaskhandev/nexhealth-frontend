export function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm">This section is coming soon.</p>
    </div>
  );
}
