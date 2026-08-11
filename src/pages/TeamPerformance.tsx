import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { PerformanceDetailModal } from "../components/team/PerformanceDetailModal";
import { fetchResponsableStats, ResponsableStats, ResponsableStatsClient } from "../lib/data";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

interface DetailView {
  title: string;
  clients: ResponsableStatsClient[];
}

export default function TeamPerformance() {
  const [stats, setStats] = useState<ResponsableStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailView | null>(null);

  useEffect(() => {
    fetchResponsableStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <DashboardLayout title="Desempeño por responsable">
        <p className="text-status-red text-sm">Error al cargar datos: {error}</p>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout title="Desempeño por responsable">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Desempeño por responsable">
      <p className="text-sm text-slate-500 mb-5 max-w-2xl">
        Información de cómo va cada gestor con la cartera que tiene asignada: qué porcentaje del monto
        asignado ya recuperó, cuántas facturas cerró y cuánto tiempo le toma en promedio resolver un caso
        desde que se le asignó hasta que el cliente queda marcado "Pagado". Haz clic en cualquier número
        para ver el detalle cliente por cliente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{r.name}</h3>
              <button
                onClick={() => setDetail({ title: `${r.name} — Cartera asignada`, clients: r.detalleAsignados })}
                className="text-2xl font-bold text-corporate-blue hover:underline"
                title="Ver detalle de la cartera asignada"
              >
                {r.porcentajeRecuperacion}%
              </button>
            </div>

            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-status-green rounded-full transition-all"
                style={{ width: `${Math.min(100, r.porcentajeRecuperacion)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <button
                onClick={() => setDetail({ title: `${r.name} — Clientes asignados`, clients: r.detalleAsignados })}
                className="text-left hover:bg-slate-50 rounded-lg p-1 -m-1"
              >
                <p className="text-xs text-slate-500">Clientes asignados</p>
                <p className="font-semibold text-slate-800 underline decoration-dotted">{r.clientesAsignados}</p>
              </button>
              <button
                onClick={() => setDetail({ title: `${r.name} — Pagados por gestión`, clients: r.detallePorGestion })}
                className="text-left hover:bg-slate-50 rounded-lg p-1 -m-1"
              >
                <p className="text-xs text-slate-500">Pagados por gestión</p>
                <p className="font-semibold text-status-green underline decoration-dotted">{r.clientesPagadosPorGestion}</p>
              </button>
              <button
                onClick={() => setDetail({ title: `${r.name} — Facturas recuperadas`, clients: r.detallePorGestion })}
                className="text-left hover:bg-slate-50 rounded-lg p-1 -m-1"
              >
                <p className="text-xs text-slate-500">Facturas recuperadas</p>
                <p className="font-semibold text-slate-800 underline decoration-dotted">{r.facturasRecuperadas}</p>
              </button>
              <div>
                <p className="text-xs text-slate-500">Días promedio de resolución</p>
                <p className="font-semibold text-slate-800">
                  {r.diasPromedioResolucion !== null ? `${r.diasPromedioResolucion} días` : "—"}
                </p>
              </div>
              {r.clientesPagadosSinGestion > 0 && (
                <div className="col-span-2">
                  <button
                    onClick={() => setDetail({ title: `${r.name} — Ya habían pagado antes (sin gestión)`, clients: r.detalleSinGestion })}
                    className="text-xs text-slate-400 hover:text-slate-600 hover:underline text-left"
                  >
                    + {r.clientesPagadosSinGestion} cliente{r.clientesPagadosSinGestion === 1 ? "" : "s"} que ya había{r.clientesPagadosSinGestion === 1 ? "" : "n"} pagado antes (no cuenta como gestión)
                  </button>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">Monto recuperado por gestión / asignado</p>
                <p className="font-semibold text-slate-800">
                  {currency(r.montoRecuperado)} <span className="text-slate-400 font-normal">de {currency(r.montoTotalAsignado)}</span>
                </p>
              </div>
            </div>
          </Card>
        ))}
        {stats.length === 0 && <p className="text-slate-400 text-sm">No hay responsables registrados todavía.</p>}
      </div>

      {detail && (
        <PerformanceDetailModal title={detail.title} clients={detail.clients} onClose={() => setDetail(null)} />
      )}
    </DashboardLayout>
  );
}
