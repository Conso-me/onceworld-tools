export function InputField({
  label,
  value,
  onChange,
  placeholder = "0",
  className = "",
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  max?: number;
}) {
  return (
    <div className={`space-y-1.5 lg:space-y-1 ${className}`}>
      <label className="block text-sm lg:text-xs font-medium text-gray-600">{label}</label>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          if (max !== undefined && raw !== "" && parseInt(raw, 10) > max) return;
          onChange(raw);
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 lg:py-2 bg-white border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
      />
    </div>
  );
}
