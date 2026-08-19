import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, HandCoins, FileSignature, Gavel, UserX, Loader2, ReceiptText } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { KpiCard } from "../components/dashboard/KpiCard";
import { AgingBarChart, SeverityPieChart, TopDebtorsList, MonthlyRecoveryChart, RecoveryBreakdownCard, MonthlyRecoveryPoint } from "../components/dashboard/Charts";
import { PerformanceDetailModal } from "../components/team/PerformanceDetailModal";
import { MonthDetailModal } from "../components/dashboard/MonthDetailModal";
import { fetchClients, ResponsableStatsClient } from "../lib/data";
import { ClientWithAgg } from "../types";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

function toDetailClients(clients: ClientWithAgg[]): ResponsableStatsClient[] {
  return clients
    .map((c) => ({
      id: c.id,
      name: c.name,
      saldo: c.saldo_total,
      facturas: c.invoices?.length ?? 0,
      diasResolucion: null,
      fechaPagado: c.estado === "Pagado" ? c.updated_at : null,
    }))
    .sort((a, b) => b.saldo - a.saldo);
}

/**
 * Recuperación mensual calculada a partir de la MISMA fuente que "Cartera recuperada — por
 * motivo" (saldo real de facturas de clientes marcados "Pagado", por el mes de updated_at) —
 * antes este gráfico usaba un campo manual ("monto" en actividades) que casi nadie llenaba,
 * lo que hacía que los dos totales no coincidieran nunca. Ahora siempre van a sumar lo mismo.
 */
function buildMonthlyRecovery(clients: ClientWithAgg[]): { points: MonthlyRecoveryPoint[]; clientsByMonth: Map<string, ClientWithAgg[]> } {
  const months: MonthlyRecoveryPoint[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - 11);
  for (let i = 0; i < 12; i++) {
    months.push({
      label: cursor.toLocaleDateString("es-EC", { month: "short", year: "2-digit" }),
      total: 0,
      clientes: 0,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const clientsByMonth = new Map<string, ClientWithAgg[]>();
  const pagados = clients.filter((c) => c.estado === "Pagado");
  for (const c of pagados) {
    const d = new Date(c.updated_at);
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (!bucket) continue; // fuera de los últimos 12 meses
    bucket.total += c.saldo_total;
    bucket.clientes += 1;
    const key = `${bucket.year}-${bucket.month}`;
    if (!clientsByMonth.has(key)) clientsByMonth.set(key, []);
    clientsByMonth.get(key)!.push(c);
  }

  return { points: months, clientsByMonth };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithAgg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ title: string; clients: ResponsableStatsClient[] } | null>(null);
  const [monthDetail, setMonthDetail] = useState<{ label: string; clients: ClientWithAgg[] } | null>(null);

  useEffect(() => {
    fetchClients().then(setClients).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <DashboardLayout title="Dashboard ejecutivo">
        <p className="text-status-red text-sm">Error al cargar datos: {error}</p>
      </DashboardLayout>
    );
  }

  if (!clients) {
    return (
      <DashboardLayout title="Dashboard ejecutivo">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando...
        </div>
      </DashboardLayout>
    );
  }

  const totalSaldo = clients.reduce((s, c) => s + c.saldo_total, 0);
  const criticos = clients.filter((c) => c.dias_max > 365).length;
  const altoRiesgo = clients.filter((c) => c.dias_max <= 180).length;
  const sinGestion = clients.filter((c) => c.estado === "Sin gestión").length;
  const convenios = clients.filter((c) => ["Convenio firmado", "Convenio enviado"].includes(c.estado)).length;
  const promesas = clients.filter((c) => c.estado === "Promesa de pago").length;
  const legal = clients.filter((c) => ["Proceso legal", "Cobro judicial"].includes(c.estado)).length;
  const yaHabianPagado = clients.filter((c) => c.estado === "Pagado" && c.pago_por_gestion === false).length;
  const { points: monthly, clientsByMonth } = buildMonthlyRecovery(clients);

  const goToClients = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    navigate(qs ? `/clients?${qs}` : "/clients");
  };

  return (
    <DashboardLayout title="Dashboard ejecutivo">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Saldo pendiente total" value={currency(totalSaldo)} icon={Wallet} tone="red" onClick={() => goToClients({})} />
        <KpiCard label="Clientes morosos" value={String(clients.length)} icon={Users} tone="blue" onClick={() => goToClients({})} />
        <KpiCard label="Muy crítico (+365d)" value={String(criticos)} icon={TrendingUp} tone="red" onClick={() => goToClients({ severidad: "Muy crítico" })} />
        <KpiCard label="Alto riesgo (120-180d)" value={String(altoRiesgo)} icon={UserX} tone="orange" onClick={() => goToClients({ severidad: "Alto riesgo" })} />
        <KpiCard label="Promesas de pago" value={String(promesas)} icon={HandCoins} tone="orange" onClick={() => goToClients({ estado: "Promesa de pago" })} />
        <KpiCard label="Convenios de pago" value={String(convenios)} icon={FileSignature} tone="blue" onClick={() => goToClients({ estado: "Convenio firmado" })} />
        <KpiCard label="En proceso judicial" value={String(legal)} icon={Gavel} tone="red" onClick={() => goToClients({ estado: "Proceso legal" })} />
        <KpiCard label="Sin gestión todavía" value={String(sinGestion)} icon={UserX} tone="slate" onClick={() => goToClients({ estado: "Sin gestión" })} />
        <KpiCard
          label="Ya habían pagado antes"
          value={String(yaHabianPagado)}
          icon={ReceiptText}
          tone="slate"
          onClick={() =>
            setDetail({
              title: "Clientes que ya habían pagado antes",
              clients: toDetailClients(clients.filter((c) => c.estado === "Pagado" && c.pago_por_gestion === false)),
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgingBarChart clients={clients} onBucketClick={(min, max) => goToClients({ diasMin: String(min), diasMax: String(max === Infinity ? 99999 : max) })} />
          <SeverityPieChart clients={clients} onSliceClick={(sev) => goToClients({ severidad: sev })} />
          <div className="md:col-span-2">
            <MonthlyRecoveryChart
              data={monthly}
              onMonthClick={(point) => {
                const key = `${point.year}-${point.month}`;
                setMonthDetail({ label: point.label, clients: clientsByMonth.get(key) ?? [] });
              }}
            />
          </div>
        </div>
        <div className="space-y-4">
          <RecoveryBreakdownCard
            clients={clients}
            onSegmentClick={(motivo) =>
              setDetail({
                title: motivo === "por_gestion" ? "Recuperado por gestión de cobranza" : "Cliente ya había pagado antes",
                clients: toDetailClients(
                  clients.filter((c) => c.estado === "Pagado" && (motivo === "sin_gestion" ? c.pago_por_gestion === false : c.pago_por_gestion !== false))
                ),
              })
            }
          />
          <TopDebtorsList clients={clients} />
        </div>
      </div>

      {detail && <PerformanceDetailModal title={detail.title} clients={detail.clients} onClose={() => setDetail(null)} />}
      {monthDetail && <MonthDetailModal monthLabel={monthDetail.label} clients={monthDetail.clients} onClose={() => setMonthDetail(null)} />}
    </DashboardLayout>
  );
}
