import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ModalShell } from "../ui/ModalShell";
import { ResponsableStatsClient } from "../../lib/data";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export function PerformanceDetailModal({
  title,
  clients,
  onClose,
}: {
  title: string;
  clients: ResponsableStatsClient[];
  onClose: () => void;
}) {
  const chartData = clients.slice(0, 10).map((c) => ({ name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name, saldo: c.saldo }));

  return (
    <ModalShell title={title} onClose={onClose} wide>
      {clients.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">No hay clientes en esta categoría todavía.</p>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              {clients.length > 10 ? "Top 10 por saldo" : "Saldo por cliente"}
            </p>
            <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 32)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Bar dataKey="saldo" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Saldo</th>
                <th className="px-3 py-2 text-left">Facturas</th>
                <th className="px-3 py-2 text-left">Días resolución</th>
                <th className="px-3 py-2 text-left">Fecha pagado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-3 py-2">{currency(c.saldo)}</td>
                  <td className="px-3 py-2">{c.facturas}</td>
                  <td className="px-3 py-2">
                    {c.diasResolucion === null
                      ? "Sin gestión previa"
                      : c.diasResolucion < 0
                      ? <span className="text-status-orange font-medium">Pagó {Math.abs(c.diasResolucion)}d antes</span>
                      : `${c.diasResolucion} días`}
                  </td>
                  <td className="px-3 py-2">{c.fechaPagado ? new Date(c.fechaPagado).toLocaleDateString("es-EC") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </ModalShell>
  );
}
