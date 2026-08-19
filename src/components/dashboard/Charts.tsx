import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from "recharts";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { ClientWithAgg } from "../../types";

// Semáforo de marca (Brandbook §27): ámbar → rojo → granate para severidad.
const PIE_COLORS: Record<string, string> = { "Alto riesgo": "#E8862C", "Crítico": "#C73A3A", "Muy crítico": "#8E1F1F" };
const AXIS = { fontSize: 11, fontFamily: "Nunito, sans-serif", fill: "#5A6275" };
const GRID = "#DCE2EE";
const TOOLTIP_STYLE = {
  background: "#E8ECF4",
  border: "none",
  borderRadius: 12,
  boxShadow: "6px 6px 16px rgba(163,177,198,.6), -6px -6px 16px rgba(255,255,255,.9)",
  fontFamily: "Prompt, sans-serif",
  fontSize: 12.5,
  color: "#151F47",
};
const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

function ChartHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="ac-display m-0" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</h3>
      {hint && <p className="m-0 mt-1.5" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{hint}</p>}
    </div>
  );
}

export function AgingBarChart({ clients, onBucketClick }: { clients: ClientWithAgg[]; onBucketClick?: (min: number, max: number) => void }) {
  const buckets = [
    { label: "120-180", min: 120, max: 180, total: 0 },
    { label: "181-365", min: 181, max: 365, total: 0 },
    { label: "+365", min: 366, max: Infinity, total: 0 },
  ];
  clients.forEach((c) => {
    const b = buckets.find((x) => c.dias_max >= x.min && c.dias_max <= x.max);
    if (b) b.total += c.saldo_total;
  });
  return (
    <Card className="p-5">
      <ChartHead title="Cartera por antigüedad" hint={onBucketClick ? "Haz clic en una barra para filtrar la cartera." : undefined} />
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={buckets}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v: number) => currency(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(48,97,170,.06)" }} />
          <Bar dataKey="total" fill="#3061AA" radius={[8, 8, 0, 0]} cursor={onBucketClick ? "pointer" : "default"} onClick={(data) => onBucketClick?.(data.min, data.max)} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function SeverityPieChart({ clients, onSliceClick }: { clients: ClientWithAgg[]; onSliceClick?: (severidad: string) => void }) {
  const counts: Record<string, number> = { "Alto riesgo": 0, "Crítico": 0, "Muy crítico": 0 };
  clients.forEach((c) => {
    if (c.dias_max > 365) counts["Muy crítico"]++;
    else if (c.dias_max > 180) counts["Crítico"]++;
    else counts["Alto riesgo"]++;
  });
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
  return (
    <Card className="p-5">
      <ChartHead title="Clientes por severidad" hint={onSliceClick ? "Haz clic en un segmento para filtrar." : undefined} />
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} label cursor={onSliceClick ? "pointer" : "default"} onClick={(entry) => onSliceClick?.(entry.name)}>
            {data.map((d) => <Cell key={d.name} fill={PIE_COLORS[d.name]} stroke="none" />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export interface MonthlyRecoveryPoint { label: string; total: number; clientes: number; year: number; month: number; }

export function MonthlyRecoveryChart({ data, onMonthClick }: { data: MonthlyRecoveryPoint[]; onMonthClick?: (point: MonthlyRecoveryPoint) => void }) {
  const renderDot = (props: { cx?: number; cy?: number; payload?: MonthlyRecoveryPoint; index?: number }) => {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined || !payload) return <g key={index} />;
    return (
      <circle key={index} cx={cx} cy={cy} r={5} fill="#1F9D57" stroke="#E8ECF4" strokeWidth={2} style={{ cursor: onMonthClick ? "pointer" : "default" }} onClick={() => onMonthClick?.(payload)} />
    );
  };

  return (
    <Card className="p-5">
      <ChartHead
        title="Recuperación mensual · últimos 12 meses"
        hint={`Monto de facturas de clientes marcados "Pagado", agrupado por el mes en que se cerraron.${onMonthClick ? " Haz clic en un punto para ver el desglose por responsable." : ""}`}
      />
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number, _name, item) => [`${currency(v)} · ${item.payload.clientes} cliente(s)`, "Recuperado"]}
            labelFormatter={(label) => `Mes: ${label}`}
            contentStyle={TOOLTIP_STYLE}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Line type="monotone" dataKey="total" name="Recuperado" stroke="#1F9D57" strokeWidth={2.5} dot={renderDot as any} activeDot={{ r: 7, stroke: "#E8ECF4", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function RecoveryBreakdownCard({ clients, onSegmentClick }: { clients: ClientWithAgg[]; onSegmentClick?: (motivo: "por_gestion" | "sin_gestion") => void }) {
  const pagados = clients.filter((c) => c.estado === "Pagado");
  const porGestion = pagados.filter((c) => c.pago_por_gestion !== false);
  const sinGestion = pagados.filter((c) => c.pago_por_gestion === false);
  const montoPorGestion = porGestion.reduce((s, c) => s + c.saldo_total, 0);
  const montoSinGestion = sinGestion.reduce((s, c) => s + c.saldo_total, 0);
  const total = montoPorGestion + montoSinGestion;
  const pctGestion = total > 0 ? (montoPorGestion / total) * 100 : 0;

  return (
    <Card className="p-5">
      <ChartHead title="Cartera recuperada — por motivo" hint='De todo lo marcado "Pagado", qué parte fue por gestión activa y qué parte el cliente ya había pagado antes.' />
      <p className="ac-display ac-num m-0 mb-4" style={{ fontSize: 30 }}>{currency(total)}</p>

      <div className="flex overflow-hidden mb-5" style={{ height: 10, borderRadius: 999, boxShadow: "var(--neu-inset-sm)" }}>
        <div style={{ width: `${pctGestion}%`, background: "var(--ac-green)" }} />
        <div style={{ width: `${100 - pctGestion}%`, background: "var(--ac-celeste)" }} />
      </div>

      <div className="flex flex-col gap-2.5" style={{ fontSize: 13 }}>
        <button onClick={() => onSegmentClick?.("por_gestion")} className="w-full flex items-center justify-between" style={{ background: "none", border: "none", padding: 0 }}>
          <span className="flex items-center gap-2.5" style={{ color: "var(--ink-soft)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ac-green)", display: "inline-block" }} /> Gestión de cobranza
          </span>
          <span className="ac-num" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--ac-navy)" }}>
            {currency(montoPorGestion)} <span style={{ color: "var(--ink-mute)", fontWeight: 400 }}>({porGestion.length})</span>
          </span>
        </button>
        <button onClick={() => onSegmentClick?.("sin_gestion")} className="w-full flex items-center justify-between" style={{ background: "none", border: "none", padding: 0 }}>
          <span className="flex items-center gap-2.5" style={{ color: "var(--ink-soft)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ac-celeste)", display: "inline-block" }} /> Cliente ya había pagado
          </span>
          <span className="ac-num" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--ac-navy)" }}>
            {currency(montoSinGestion)} <span style={{ color: "var(--ink-mute)", fontWeight: 400 }}>({sinGestion.length})</span>
          </span>
        </button>
      </div>
    </Card>
  );
}

export function TopDebtorsList({ clients }: { clients: ClientWithAgg[] }) {
  const top = [...clients].sort((a, b) => b.saldo_total - a.saldo_total).slice(0, 8);
  const max = Math.max(...top.map((d) => d.saldo_total), 1);
  return (
    <Card className="p-5">
      <ChartHead title="Ranking de mayores deudores" />
      <ul className="flex flex-col gap-3.5 m-0 p-0" style={{ listStyle: "none" }}>
        {top.map((d, idx) => (
          <li key={d.id}>
            <Link to={`/clients/${d.id}`} className="block" style={{ textDecoration: "none" }}>
              <div className="flex justify-between mb-1.5" style={{ fontSize: 12 }}>
                <span className="truncate pr-2" style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--ink)" }}>
                  <span style={{ color: "var(--ac-blue)" }}>{String(idx + 1).padStart(2, "0")}</span> {d.name}
                </span>
                <span className="ac-num shrink-0" style={{ color: "var(--ink-soft)" }}>{currency(d.saldo_total)}</span>
              </div>
              <div className="overflow-hidden" style={{ height: 8, borderRadius: 999, boxShadow: "var(--neu-inset-sm)" }}>
                <div style={{ height: "100%", width: `${(d.saldo_total / max) * 100}%`, borderRadius: 999, background: idx === 0 ? "var(--ac-orange)" : "var(--ac-blue)" }} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
