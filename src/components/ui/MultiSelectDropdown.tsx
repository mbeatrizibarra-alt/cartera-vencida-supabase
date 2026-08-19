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

  const active = selected.length > 0;
  const buttonText =
    selected.length === 0 ? label : selected.length === 1 ? options.find((o) => o.value === selected[0])?.label ?? label : `${label} (${selected.length})`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3.5 py-2"
        style={{
          border: "none",
          borderRadius: 999,
          fontSize: 12.5,
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          background: "var(--neu)",
          color: active ? "var(--ac-blue)" : "var(--ink-soft)",
          boxShadow: active ? "var(--neu-inset-sm)" : "var(--neu-raised-sm)",
        }}
      >
        {buttonText}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute z-20 mt-2 w-64 max-h-80 overflow-y-auto py-1.5"
          style={{ background: "var(--neu)", borderRadius: 16, boxShadow: "var(--neu-raised), 0 18px 40px rgba(14,21,48,.18)" }}
        >
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-4 py-2"
              style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ac-blue)", borderBottom: "1px solid var(--line)", background: "none", border: "none" }}
            >
              Limpiar selección
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 px-4 py-2 cursor-pointer"
              style={{ fontSize: 13, color: "var(--ink)" }}
            >
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} style={{ accentColor: "var(--ac-blue)" }} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
