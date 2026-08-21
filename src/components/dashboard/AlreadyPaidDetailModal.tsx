import { ModalShell } from "../ui/ModalShell";
import { AlreadyPaidClient } from "../../lib/data";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

function DiasBadge({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-slate-400">Sin gestión previa</span>;
  if (dias < 0) {
    return <span className="text-status-orange font-semibold">Pagó {Math.abs(dias)} día(s) antes de tomar el caso</span>;
  }
  return <span className="font-semibold text-slate-700">{dias} día(s) después de tomar el caso</span>;
}

export function AlreadyPaidDetailModal({ clients, onClose }: { clients: AlreadyPaidClient[]; onClose: () => void }) {
  return (
    <ModalShell title="Clientes que ya habían pagado antes" onClose={onClose} wide>
      <p className="text-xs text-slate-400 mb-4">
        "Fecha de pago" es la que reporta el cliente (según el comprobante que envía). Cuando no la tenemos, se usa
        como estimado la fecha en que se marcó "Pagado" en el sistema — se señala con <span className="italic">(estimado)</span>.
        Un número de días <span className="text-status-orange font-medium">negativo</span> significa que el cliente
        ya había pagado antes de que empezáramos a gestionar el caso.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-left">Responsable</th>
            <th className="px-3 py-2 text-left">Saldo</th>
            <th className="px-3 py-2 text-left">1ª gestión</th>
            <th className="px-3 py-2 text-left">Fecha de pago</th>
            <th className="px-3 py-2 text-left">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
              <td className="px-3 py-2">{c.responsableNombre ?? "Sin asignar"}</td>
              <td className="px-3 py-2">{currency(c.saldo)}</td>
              <td className="px-3 py-2">{c.fechaPrimeraGestion ? new Date(c.fechaPrimeraGestion).toLocaleDateString("es-EC") : "—"}</td>
              <td className="px-3 py-2">
                {c.fechaPagoReportada
                  ? new Date(c.fechaPagoReportada + "T00:00:00").toLocaleDateString("es-EC")
                  : `${new Date(c.fechaMarcadoPagado).toLocaleDateString("es-EC")} (estimado)`}
              </td>
              <td className="px-3 py-2"><DiasBadge dias={c.diasDesdeGestion} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {clients.length === 0 && <p className="text-slate-400 text-sm py-4">No hay clientes en esta categoría todavía.</p>}
    </ModalShell>
  );
}
