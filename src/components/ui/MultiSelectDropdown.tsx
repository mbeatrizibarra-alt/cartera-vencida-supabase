import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const buttonText =
    selected.length === 0 ? label : selected.length === 1 ? options.find((o) => o.value === selected[0])?.label ?? label : `${label} (${selected.length})`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 border rounded-lg text-sm px-3 py-2 ${
          selected.length > 0 ? "border-corporate-blueLight text-corporate-blue bg-blue-50" : "border-slate-300 text-slate-700"
        }`}
      >
        {buttonText}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-corporate-blue hover:bg-slate-50 border-b border-slate-100"
            >
              Limpiar selección
            </button>
          )}
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} className="rounded border-slate-300" />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
