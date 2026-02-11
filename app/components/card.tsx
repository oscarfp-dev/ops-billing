export function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-gray-300 p-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}