import { useTranslation } from "react-i18next";

const colorClasses = {
  orange: "text-orange-600",
  purple: "text-purple-600",
  green: "text-green-600",
  gray: "text-gray-800",
} as const;

export function ResultRow({
  label,
  value,
  current,
  color = "gray",
}: {
  label: string;
  value: number;
  current?: number;
  color?: keyof typeof colorClasses;
}) {
  const { t } = useTranslation();
  const remaining = current !== undefined ? value - current : undefined;
  const isAchieved = remaining !== undefined && remaining <= 0;

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold ${colorClasses[color]}`}>
          {value.toLocaleString()}
        </span>
        {remaining !== undefined && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isAchieved
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isAchieved ? t("achieved") : t("remaining", { value: remaining.toLocaleString() })}
          </span>
        )}
      </div>
    </div>
  );
}
