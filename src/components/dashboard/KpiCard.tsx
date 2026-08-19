import { LucideIcon } from "lucide-react";

/**
 * KPI neomórfico. `hero` convierte la tarjeta en la métrica principal
 * (bloque navy) — úsalo en una sola tarjeta por grupo, la más importante.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hero = false,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: string;
  hero?: boolean;
  onClick?: () => void;
}) {
  const TONE_COLOR: Record<string, string> = {
    blue: "var(--ac-blue)",
    green: "var(--ac-green)",
    orange: "var(--ac-amber)",
    red: "var(--ac-red)",
    slate: "var(--ink-soft)",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`ac-kpi ${hero ? "ac-kpi-hero" : ""} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className="relative z-10 block">
        <span className="k-label block">{label}</span>
        <span className="k-value block">{value}</span>
      </span>
      <span className="k-icon relative z-10" style={hero ? undefined : { color: TONE_COLOR[tone] ?? TONE_COLOR.blue }}>
        <Icon size={19} />
      </span>
    </button>
  );
}
