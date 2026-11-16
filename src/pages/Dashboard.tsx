import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, HandCoins, FileSignature, Gavel, UserX, Loader2, ReceiptText } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { KpiCard } from "../components/dashboard/KpiCard";
import { AgingBarChart, SeverityPieChart, TopDebtorsList, MonthlyRecoveryChart, RecoveryBreakdownCard, MonthlyRecoveryPoint } from "../components/dashboard/Charts";
import { PerformanceDetailModal } from "../components/team/PerformanceDetailModal";
import { MonthDetailModal, MonthPaymentRow } from "../components/dashboard/MonthDetailModal";
import { AlreadyPaidDetailModal } from "../components/dashboard/AlreadyPaidDetailModal";
import { fetchClients, fetchAlreadyPaidStats, fetchPayments, AlreadyPaidStats, PaymentRecord, ResponsableStatsClient } from "../lib/data";
import { useAutoRefresh } from "../lib/useAutoRefresh";
import { ClientWithAgg, ESTADOS_CERRADOS } from "../types";

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
 * Pagos recibidos por mes: suma de los pagos que el equipo registra (actividad "Pago recibido"
 * con monto), en el mes en que se registraron. Es el dato que sirve para facturar sobre lo
 * recaudado, porque trae el monto realmente recibido y no el saldo completo de la factura.
 */
function buildMonthlyPayments(payments: PaymentRecord[]): { points: MonthlyRecoveryPoint[]; paymentsByMonth: Map<string, PaymentRecord[]> } {
  const months: MonthlyRecoveryPoint[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - 11);
  for (let i = 0; i < 12; i++) {
    months.push({
      label: cursor.toLocaleDateString("es-EC", { month: "short", year: "2-digit" }),
      total: 0,
      pagos: 0,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const paymentsByMonth = new Map<string, PaymentRecord[]>();
  for (const p of payments) {
    const d = new Date(p.created_at);
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (!bucket) continue;
    bucket.total += p.monto;
    bucket.pagos += 1;
    const key = `${bucket.year}-${bucket.month}`;
    if (!paymentsByMonth.has(key)) paymentsByMonth.set(key, []);
    paymentsByMonth.get(key)!.push(p);
  }
  for (const m of months) m.total = Math.round(m.total * 100) / 100;

  return { points: months, paymentsByMonth };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithAgg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ title: string; clients: ResponsableStatsClient[] } | null>(null);
  const [monthDetail, setMonthDetail] = useState<{ label: string; payments: MonthPaymentRow[] } | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState<AlreadyPaidStats | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [showAlreadyPaidDetail, setShowAlreadyPaidDetail] = useState(false);
  const hasData = useRef(false);

  // Carga inicial + refresco automático (cada minuto y al volver a la pestaña), para que lo
  // que registre cualquier persona aparezca aquí sin recargar la página.
  const load = useCallback(async () => {
    try {
      const [c, p, a] = await Promise.all([fetchClients(), fetchPayments(), fetchAlreadyPaidStats().catch(() => null)]);
      setClients(c);
      setPayments(p);
      setAlreadyPaid(a);
      setError(null);
      hasData.current = true;
    } catch (e) {
      // Si ya hay datos en pantalla, un fallo puntual del refresco no debe taparlos con un error.
      if (!hasData.current) setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useAutoRefresh(load, 60000);

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

  // Todo lo que mide "lo que falta por cobrar" usa solo cuentas abiertas: las "Pagado" y
  // "Caso cerrado" ya no se cobran, aunque sus facturas conserven el saldo con el que se
  // cargaron. Así cada cifra del tablero coincide con la lista de Cartera de clientes.
  const abiertos = clients.filter((c) => !ESTADOS_CERRADOS.includes(c.estado));
  const totalSaldo = Math.round(abiertos.reduce((s, c) => s + c.saldo_total, 0) * 100) / 100;
  const criticos = abiertos.filter((c) => c.dias_max > 365).length;
  const altoRiesgo = abiertos.filter((c) => c.dias_max <= 180).length;
  const sinGestion = clients.filter((c) => c.estado === "Sin gestión").length;
  const convenios = clients.filter((c) => ["Convenio firmado", "Convenio enviado"].includes(c.estado)).length;
  const promesas = clients.filter((c) => c.estado === "Promesa de pago").length;
  const legal = clients.filter((c) => ["Proceso legal", "Cobro judicial"].includes(c.estado)).length;
  const yaHabianPagado = clients.filter((c) => c.estado === "Pagado" && c.pago_por_gestion === false).length;
  const { points: monthly, paymentsByMonth } = buildMonthlyPayments(payments);
  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const clientesConPago = new Set(payments.map((p) => p.client_id));
  // Marcados "Pagado" por gestión que no tienen ningún pago registrado: son los casos que el
  // equipo debería completar registrando el pago con su monto.
  const pagadosSinPago = clients.filter((c) => c.estado === "Pagado" && c.pago_por_gestion !== false && !clientesConPago.has(c.id));

  const goToClients = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    navigate(qs ? `/clients?${qs}` : "/clients");
  };

  return (
    <DashboardLayout title="Dashboard ejecutivo">
      {/* La primera tarjeta va en `hero` (bloque navy a doble ancho): es la métrica que
          manda en la pantalla. Una sola por grupo — si son dos, deja de ser jerarquía. */}
      {/* Rejilla guiada por el ancho real disponible, no por breakpoints fijos:
          con auto-fit las tarjetas se acomodan igual en 1240px que en 1600px. */}
      <div className="gap-4 mb-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <div style={{ gridColumn: "span 2" }}>
          <KpiCard label="Saldo pendiente total" value={currency(totalSaldo)} icon={Wallet} tone="red" hero onClick={() => goToClients({})} />
        </div>
        <KpiCard label="Clientes morosos" value={String(abiertos.length)} icon={Users} tone="blue" onClick={() => goToClients({})} />
        <KpiCard label="Muy crítico (+365d)" value={String(criticos)} icon={TrendingUp} tone="red" onClick={() => goToClients({ severidad: "Muy crítico" })} />
        <KpiCard label="Alto riesgo (120-180d)" value={String(altoRiesgo)} icon={UserX} tone="orange" onClick={() => goToClients({ severidad: "Alto riesgo" })} />
        <KpiCard label="Promesas de pago" value={String(promesas)} icon={HandCoins} tone="orange" onClick={() => goToClients({ estado: "Promesa de pago" })} />
        <KpiCard label="Convenios de pago" value={String(convenios)} icon={FileSignature} tone="blue" onClick={() => goToClients({ estado: "Convenio firmado" })} />
        <KpiCard label="En proceso judicial" value={String(legal)} icon={Gavel} tone="red" onClick={() => goToClients({ estado: "Proceso legal" })} />
        <KpiCard label="Sin gestión todavía" value={String(sinGestion)} icon={UserX} tone="slate" onClick={() => goToClients({ estado: "Sin gestión" })} />
        <KpiCard
          label="Ya habían pagado antes"
          value={alreadyPaid ? `${alreadyPaid.cantidad}${alreadyPaid.diasPromedio !== null ? ` · ${alreadyPaid.diasPromedio} días prom.` : ""}` : String(yaHabianPagado)}
          icon={ReceiptText}
          tone="slate"
          onClick={() => setShowAlreadyPaidDetail(true)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgingBarChart clients={abiertos} onBucketClick={(min, max) => goToClients({ diasMin: String(min), diasMax: String(max === Infinity ? 99999 : max) })} />
          <SeverityPieChart clients={abiertos} onSliceClick={(sev) => goToClients({ severidad: sev })} />
          <div className="md:col-span-2">
            <MonthlyRecoveryChart
              data={monthly}
              onMonthClick={(point) => {
                const key = `${point.year}-${point.month}`;
                const rows: MonthPaymentRow[] = (paymentsByMonth.get(key) ?? []).map((p) => {
                  const c = clientsById.get(p.client_id);
                  return {
                    id: p.id,
                    cliente: c?.name ?? "Cliente inactivo",
                    responsable: c?.responsable_nombre ?? "Sin asignar",
                    monto: p.monto,
                    fecha: p.created_at,
                  };
                });
                setMonthDetail({ label: point.label, payments: rows });
              }}
              sinPago={{
                cantidad: pagadosSinPago.length,
                saldo: Math.round(pagadosSinPago.reduce((sum, c) => sum + c.saldo_total, 0) * 100) / 100,
                onClick: () => setDetail({ title: 'Marcados "Pagado" por gestión sin pago registrado', clients: toDetailClients(pagadosSinPago) }),
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
          <TopDebtorsList clients={abiertos} />
        </div>
      </div>

      {detail && <PerformanceDetailModal title={detail.title} clients={detail.clients} onClose={() => setDetail(null)} />}
      {monthDetail && <MonthDetailModal monthLabel={monthDetail.label} payments={monthDetail.payments} onClose={() => setMonthDetail(null)} />}
      {showAlreadyPaidDetail && alreadyPaid && (
        <AlreadyPaidDetailModal clients={alreadyPaid.detalle} onClose={() => setShowAlreadyPaidDetail(false)} />
      )}
    </DashboardLayout>
  );
}
