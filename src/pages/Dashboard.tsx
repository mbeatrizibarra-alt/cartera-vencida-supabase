import { useEffect, useState } from "react";
import { Wallet, Users, TrendingUp, HandCoins, FileSignature, Gavel, UserX, Loader2 } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { KpiCard } from "../components/dashboard/KpiCard";
import { AgingBarChart, SeverityPieChart, TopDebtorsList } from "../components/dashboard/Charts";
import { fetchClients } from "../lib/data";
import { ClientWithAgg } from "../types";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export default function Dashboard() {
  const [clients, setClients] = useState<ClientWithAgg[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <DashboardLayout title="Dashboard ejecutivo">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Saldo pendiente total" value={currency(totalSaldo)} icon={Wallet} tone="red" />
        <KpiCard label="Clientes morosos" value={String(clients.length)} icon={Users} tone="blue" />
        <KpiCard label="Muy crítico (+365d)" value={String(criticos)} icon={TrendingUp} tone="red" />
        <KpiCard label="Alto riesgo (120-180d)" value={String(altoRiesgo)} icon={UserX} tone="orange" />
        <KpiCard label="Promesas de pago" value={String(promesas)} icon={HandCoins} tone="orange" />
        <KpiCard label="Convenios de pago" value={String(convenios)} icon={FileSignature} tone="blue" />
        <KpiCard label="En proceso judicial" value={String(legal)} icon={Gavel} tone="red" />
        <KpiCard label="Sin gestión todavía" value={String(sinGestion)} icon={UserX} tone="slate" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgingBarChart clients={clients} />
          <SeverityPieChart clients={clients} />
        </div>
        <TopDebtorsList clients={clients} />
      </div>
    </DashboardLayout>
  );
}
