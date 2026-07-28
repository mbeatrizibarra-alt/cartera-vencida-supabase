import { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";

const TONE_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-corporate-blue",
  green: "bg-status-greenBg text-status-green",
  orange: "bg-status-orangeBg text-status-orange",
  red: "bg-status-redBg text-status-red",
  slate: "bg-slate-100 text-slate-600",
};

export function KpiCard({ label, value, icon: Icon, tone = "blue" }: { label: string; value: string; icon: LucideIcon; tone?: string }) {
  return (
    <Card className="p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
      <div className={`p-2.5 rounded-lg ${TONE_CLASSES[tone]}`}>
        <Icon size={20} />
      </div>
    </Card>
  );
}
