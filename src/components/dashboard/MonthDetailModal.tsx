import { ModalShell } from "../ui/ModalShell";
import { ClientWithAgg } from "../../types";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export function MonthDetailModal({
  monthLabel,
  clients,
  onClose,
}: {
  monthLabel: string;
  clients: ClientWithAgg[];
  onClose: () => void;
}) {
  const total = clients.reduce((s, c) => s + c.saldo_total, 0);

  const byResponsable = new Map<string, { nombre: string; monto: number; clientes: number }>();
  for (const c of clients) {
    const key = c.responsable_id ?? "__sin_asignar__";
    const nombre = c.responsable_nombre ?? "Sin asignar";
    const entry = byResponsable.get(key) ?? { nombre, monto: 0, clientes: 0 };
    entry.monto += c.saldo_total;
    entry.clientes += 1;
    byResponsable.set(key, entry);
  }
  const responsableRows = Array.from(byResponsable.values()).sort((a, b) => b.monto - a.monto);
  const maxMonto = Math.max(...responsableRows.map((r) => r.monto), 1);

  return (
    <ModalShell title={`Recuperación de ${monthLabel}`} onClose={onClose} wide>
      <p className="text-2xl font-bold text-slate-800 mb-1">{currency(total)}</p>
      <p className="text-xs text-slate-400 mb-5">{clients.length} cliente(s) cerrado(s) ese mes</p>

      <p className="text-xs font-semibold text-slate-500 mb-2">Por responsable</p>
      <ul className="space-y-2 mb-6">
        {responsableRows.map((r) => (
          <li key={r.nombre}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">{r.nombre}</span>
              <span className="text-slate-600">{currency(r.monto)} <span className="text-slate-400">({r.clientes})</span></span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-corporate-blueLight rounded-full" style={{ width: `${(r.monto / maxMonto) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs font-semibold text-slate-500 mb-2">Clientes</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-left">Responsable</th>
            <th className="px-3 py-2 text-left">Saldo</th>
            <th className="px-3 py-2 text-left">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {clients
            .sort((a, b) => b.saldo_total - a.saldo_total)
            .map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                <td className="px-3 py-2">{c.responsable_nombre ?? "Sin asignar"}</td>
                <td className="px-3 py-2">{currency(c.saldo_total)}</td>
                <td className="px-3 py-2">{new Date(c.updated_at).toLocaleDateString("es-EC")}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </ModalShell>
  );
}
