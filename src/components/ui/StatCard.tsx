import type { ReactNode } from "react";

const accentClasses = {
  indigo: "border-indigo-200 bg-indigo-50/50",
  orange: "border-orange-200 bg-orange-50/50",
  purple: "border-purple-200 bg-purple-50/50",
  green: "border-green-200 bg-green-50/50",
} as const;

export function StatCard({
  title,
  children,
  accent = "indigo",
}: {
  title: string;
  children: ReactNode;
  accent?: keyof typeof accentClasses;
}) {
  return (
    <div
      className={`rounded-2xl border-2 ${accentClasses[accent]} p-4 lg:p-3 space-y-3 lg:space-y-2`}
    >
      <h4 className="font-semibold text-gray-700">{title}</h4>
      {children}
    </div>
  );
}
