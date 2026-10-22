import { ModalShell } from "../ui/ModalShell";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export interface MonthPaymentRow {
  id: string;
  cliente: string;
  responsable: string;
  monto: number;
  fecha: string;
}

export function MonthDetailModal({
  monthLabel,
  payments,
  onClose,
}: {
  monthLabel: string;
  payments: MonthPaymentRow[];
  onClose: () => void;
}) {
  const total = Math.round(payments.reduce((s, p) => s + p.monto, 0) * 100) / 100;

  const byResponsable = new Map<string, { nombre: string; monto: number; pagos: number }>();
  for (const p of payments) {
    const entry = byResponsable.get(p.responsable) ?? { nombre: p.responsable, monto: 0, pagos: 0 };
    entry.monto += p.monto;
    entry.pagos += 1;
    byResponsable.set(p.responsable, entry);
  }
  const responsableRows = Array.from(byResponsable.values()).sort((a, b) => b.monto - a.monto);
  const maxMonto = Math.max(...responsableRows.map((r) => r.monto), 1);
  const ordenados = [...payments].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <ModalShell title={`Pagos recibidos · ${monthLabel}`} onClose={onClose} wide>
      <p className="text-2xl font-bold text-slate-800 mb-1">{currency(total)}</p>
      <p className="text-xs text-slate-400 mb-5">{payments.length} pago(s) registrado(s) en el mes</p>

      {payments.length === 0 ? (
        <p className="text-sm text-slate-400">No se registró ningún pago en este mes.</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-slate-500 mb-2">Por responsable</p>
          <ul className="space-y-2 mb-6">
            {responsableRows.map((r) => (
              <li key={r.nombre}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{r.nombre}</span>
                  <span className="text-slate-600">{currency(r.monto)} <span className="text-slate-400">({r.pagos} pago(s))</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-corporate-blueLight rounded-full" style={{ width: `${(r.monto / maxMonto) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs font-semibold text-slate-500 mb-2">Pagos</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-left">Monto</th>
                <th className="px-3 py-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{p.cliente}</td>
                  <td className="px-3 py-2">{p.responsable}</td>
                  <td className="px-3 py-2">{currency(p.monto)}</td>
                  <td className="px-3 py-2">{new Date(p.fecha).toLocaleDateString("es-EC")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </ModalShell>
  );
}
