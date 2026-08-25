export default function ProcessingMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#090b10] px-5 py-4">
      <p className="text-xs text-zinc-600">{label}</p>

      <p className="mt-2 font-mono text-lg font-medium text-zinc-200">
        {value}
      </p>
    </div>
  );
}
