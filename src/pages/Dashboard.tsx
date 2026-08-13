import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, HandCoins, FileSignature, Gavel, UserX, Loader2, ReceiptText } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { KpiCard } from "../components/dashboard/KpiCard";
import { AgingBarChart, SeverityPieChart, TopDebtorsList, MonthlyRecoveryChart, RecoveryBreakdownCard } from "../components/dashboard/Charts";
import { fetchClients, fetchMonthlyRecovery } from "../lib/data";
import { ClientWithAgg } from "../types";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithAgg[] | null>(null);
  const [monthly, setMonthly] = useState<{ label: string; total: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients().then(setClients).catch((e) => setError(e.message));
    fetchMonthlyRecovery().then(setMonthly).catch(() => setMonthly([]));
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
        <KpiCard label="Ya habían pagado antes" value={String(yaHabianPagado)} icon={ReceiptText} tone="slate" onClick={() => goToClients({ estado: "Pagado" })} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgingBarChart clients={clients} onBucketClick={(min, max) => goToClients({ diasMin: String(min), diasMax: String(max === Infinity ? 99999 : max) })} />
          <SeverityPieChart clients={clients} onSliceClick={(sev) => goToClients({ severidad: sev })} />
          <div className="md:col-span-2">
            <MonthlyRecoveryChart data={monthly} />
          </div>
        </div>
        <div className="space-y-4">
          <RecoveryBreakdownCard clients={clients} />
          <TopDebtorsList clients={clients} />
        </div>
      </div>
    </DashboardLayout>
  );
}
