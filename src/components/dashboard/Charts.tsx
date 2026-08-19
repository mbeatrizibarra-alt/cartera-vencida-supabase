import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from "recharts";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { ClientWithAgg } from "../../types";

const PIE_COLORS: Record<string, string> = { "Alto riesgo": "#EA580C", "Crítico": "#DC2626", "Muy crítico": "#7F1D1D" };
const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export function AgingBarChart({
  clients,
  onBucketClick,
}: {
  clients: ClientWithAgg[];
  onBucketClick?: (min: number, max: number) => void;
}) {
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
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Cartera por antigüedad {onBucketClick && <span className="text-xs font-normal text-slate-400">(clic para filtrar)</span>}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={buckets}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => currency(v)} />
          <Bar
            dataKey="total"
            fill="#2563EB"
            radius={[6, 6, 0, 0]}
            cursor={onBucketClick ? "pointer" : "default"}
            onClick={(data) => onBucketClick?.(data.min, data.max)}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function SeverityPieChart({
  clients,
  onSliceClick,
}: {
  clients: ClientWithAgg[];
  onSliceClick?: (severidad: string) => void;
}) {
  const counts: Record<string, number> = { "Alto riesgo": 0, "Crítico": 0, "Muy crítico": 0 };
  clients.forEach((c) => {
    if (c.dias_max > 365) counts["Muy crítico"]++;
    else if (c.dias_max > 180) counts["Crítico"]++;
    else counts["Alto riesgo"]++;
  });
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Clientes por severidad {onSliceClick && <span className="text-xs font-normal text-slate-400">(clic para filtrar)</span>}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            label
            cursor={onSliceClick ? "pointer" : "default"}
            onClick={(entry) => onSliceClick?.(entry.name)}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={PIE_COLORS[d.name]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export interface MonthlyRecoveryPoint {
  label: string;
  total: number;
  clientes: number;
  year: number;
  month: number;
}

export function MonthlyRecoveryChart({ data, onMonthClick }: { data: MonthlyRecoveryPoint[]; onMonthClick?: (point: MonthlyRecoveryPoint) => void }) {
  const renderDot = (props: { cx?: number; cy?: number; payload?: MonthlyRecoveryPoint; index?: number }) => {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined || !payload) return <g key={index} />;
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={5}
        fill="#16A34A"
        stroke="#fff"
        strokeWidth={1.5}
        style={{ cursor: onMonthClick ? "pointer" : "default" }}
        onClick={() => onMonthClick?.(payload)}
      />
    );
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Recuperación mensual (últimos 12 meses)</h3>
      <p className="text-xs text-slate-400 mb-3">
        Monto de facturas de clientes marcados "Pagado", agrupado por el mes en que se cerraron.
        {onMonthClick && " Haz clic en un punto para ver el desglose por responsable de ese mes."}
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v: number, _name, item) => [`${currency(v)} · ${item.payload.clientes} cliente(s)`, "Recuperado"]}
            labelFormatter={(label) => `Mes: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Recuperado"
            stroke="#16A34A"
            strokeWidth={2.5}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dot={renderDot as any}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function RecoveryBreakdownCard({
  clients,
  onSegmentClick,
}: {
  clients: ClientWithAgg[];
  onSegmentClick?: (motivo: "por_gestion" | "sin_gestion") => void;
}) {
  const pagados = clients.filter((c) => c.estado === "Pagado");
  const porGestion = pagados.filter((c) => c.pago_por_gestion !== false);
  const sinGestion = pagados.filter((c) => c.pago_por_gestion === false);
  const montoPorGestion = porGestion.reduce((s, c) => s + c.saldo_total, 0);
  const montoSinGestion = sinGestion.reduce((s, c) => s + c.saldo_total, 0);
  const total = montoPorGestion + montoSinGestion;
  const pctGestion = total > 0 ? (montoPorGestion / total) * 100 : 0;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Cartera recuperada — por motivo</h3>
      <p className="text-xs text-slate-400 mb-3">De todo lo marcado "Pagado", qué parte fue por gestión activa y qué parte el cliente ya había pagado antes.</p>

      <p className="text-2xl font-bold text-slate-800 mb-3">{currency(total)}</p>

      <div className="h-2.5 rounded-full overflow-hidden bg-slate-100 flex mb-4">
        <div className="h-full bg-status-green" style={{ width: `${pctGestion}%` }} />
        <div className="h-full bg-slate-400" style={{ width: `${100 - pctGestion}%` }} />
      </div>

      <div className="space-y-2 text-sm">
        <button
          onClick={() => onSegmentClick?.("por_gestion")}
          className={`w-full flex items-center justify-between ${onSegmentClick ? "hover:bg-slate-50 rounded-lg -mx-1 px-1" : ""}`}
        >
          <span className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-status-green inline-block" /> Gestión de cobranza
          </span>
          <span className="font-semibold text-slate-800">{currency(montoPorGestion)} <span className="text-slate-400 font-normal">({porGestion.length})</span></span>
        </button>
        <button
          onClick={() => onSegmentClick?.("sin_gestion")}
          className={`w-full flex items-center justify-between ${onSegmentClick ? "hover:bg-slate-50 rounded-lg -mx-1 px-1" : ""}`}
        >
          <span className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Cliente ya había pagado
          </span>
          <span className="font-semibold text-slate-800">{currency(montoSinGestion)} <span className="text-slate-400 font-normal">({sinGestion.length})</span></span>
        </button>
      </div>
    </Card>
  );
}

export function TopDebtorsList({ clients }: { clients: ClientWithAgg[] }) {
  const top = [...clients].sort((a, b) => b.saldo_total - a.saldo_total).slice(0, 8);
  const max = Math.max(...top.map((d) => d.saldo_total), 1);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Ranking de mayores deudores</h3>
      <ul className="space-y-3">
        {top.map((d, idx) => (
          <li key={d.id}>
            <Link to={`/clients/${d.id}`} className="block hover:opacity-70 transition-opacity">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 truncate pr-2">{idx + 1}. {d.name}</span>
                <span className="text-slate-500 shrink-0">{currency(d.saldo_total)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-corporate-blueLight rounded-full" style={{ width: `${(d.saldo_total / max) * 100}%` }} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
