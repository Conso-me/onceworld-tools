const colorClasses = {
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  indigo: "bg-indigo-500",
} as const;

export function ProgressBar({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: keyof typeof colorClasses;
}) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClasses[color]} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
