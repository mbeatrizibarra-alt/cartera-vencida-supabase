import { ModalShell } from "../ui/ModalShell";
import { AlreadyPaidClient } from "../../lib/data";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export function AlreadyPaidDetailModal({ clients, onClose }: { clients: AlreadyPaidClient[]; onClose: () => void }) {
  return (
    <ModalShell title="Clientes que ya habían pagado antes" onClose={onClose} wide>
      <p className="text-xs text-slate-400 mb-4">
        Días desde la primera gestión de cobro registrada (primera actividad) hasta que el cliente quedó marcado "Pagado".
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-left">Responsable</th>
            <th className="px-3 py-2 text-left">Saldo</th>
            <th className="px-3 py-2 text-left">1ª gestión</th>
            <th className="px-3 py-2 text-left">Pagado</th>
            <th className="px-3 py-2 text-left">Días</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
              <td className="px-3 py-2">{c.responsableNombre ?? "Sin asignar"}</td>
              <td className="px-3 py-2">{currency(c.saldo)}</td>
              <td className="px-3 py-2">{c.fechaPrimeraGestion ? new Date(c.fechaPrimeraGestion).toLocaleDateString("es-EC") : "—"}</td>
              <td className="px-3 py-2">{new Date(c.fechaPagado).toLocaleDateString("es-EC")}</td>
              <td className="px-3 py-2 font-semibold">{c.diasDesdeGestion !== null ? `${c.diasDesdeGestion} días` : "Sin gestión previa"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {clients.length === 0 && <p className="text-slate-400 text-sm py-4">No hay clientes en esta categoría todavía.</p>}
    </ModalShell>
  );
}
