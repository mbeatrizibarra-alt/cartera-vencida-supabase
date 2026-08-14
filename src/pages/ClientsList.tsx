import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, Loader2, UserPlus } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { fetchClients, fetchResponsables, updateClient } from "../lib/data";
import { ClientWithAgg, Responsable, ESTADOS, ESTADO_TONE, SEVERIDAD_TONE, severidad } from "../types";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

type SortKey = "fecha_min" | "saldo_total" | "dias_max" | "name";

export default function ClientsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientWithAgg[] | null>(null);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [estadoFilter, setEstadoFilter] = useState(searchParams.get("estado") ?? "");
  const [sevFilter, setSevFilter] = useState(searchParams.get("severidad") ?? "");
  const [respFilter, setRespFilter] = useState(searchParams.get("resp") ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("fecha_min");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([fetchClients(), fetchResponsables()]);
    setClients(c);
    setResponsables(r);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refleja los filtros activos en la URL, para que si entras a un cliente y usas
  // "Volver", regreses exactamente a la misma búsqueda/filtro que tenías aplicado.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (estadoFilter) params.estado = estadoFilter;
    if (sevFilter) params.severidad = sevFilter;
    if (respFilter) params.resp = respFilter;
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, estadoFilter, sevFilter, respFilter]);

  const rows = useMemo(() => {
    if (!clients) return [];
    const diasMin = searchParams.get("diasMin") ? Number(searchParams.get("diasMin")) : null;
    const diasMax = searchParams.get("diasMax") ? Number(searchParams.get("diasMax")) : null;
    const motivo = searchParams.get("motivo"); // "sin_gestion" | "por_gestion" | null
    let filtered = clients.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.tax_id.includes(search);
      const matchesEstado = !estadoFilter || c.estado === estadoFilter;
      const matchesSev = !sevFilter || severidad(c.dias_max) === sevFilter;
      const matchesResp =
        !respFilter || (respFilter === "__unassigned__" ? !c.responsable_id : c.responsable_id === respFilter);
      const matchesDias = (diasMin === null || c.dias_max >= diasMin) && (diasMax === null || c.dias_max <= diasMax);
      const matchesMotivo =
        !motivo || (motivo === "sin_gestion" ? c.pago_por_gestion === false : c.pago_por_gestion !== false);
      return matchesSearch && matchesEstado && matchesSev && matchesResp && matchesDias && matchesMotivo;
    });
    filtered = [...filtered].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "fecha_min") { av = a.fecha_min ?? (sortDir === "asc" ? "9999" : ""); bv = b.fecha_min ?? (sortDir === "asc" ? "9999" : ""); }
      else if (sortKey === "saldo_total") { av = a.saldo_total; bv = b.saldo_total; }
      else if (sortKey === "dias_max") { av = a.dias_max; bv = b.dias_max; }
      else { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [clients, search, estadoFilter, sevFilter, respFilter, sortKey, sortDir, searchParams]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  async function handleAssignResponsable(clientId: string, responsableId: string) {
    // Se actualiza primero en pantalla para que se sienta inmediato, y se confirma con la base de datos.
    setClients((prev) => prev?.map((c) => (c.id === clientId ? { ...c, responsable_id: responsableId || null } : c)) ?? prev);
    await updateClient(clientId, { responsable_id: responsableId || null });
    load();
  }

  if (!clients) {
    return (
      <DashboardLayout title="Cartera de clientes">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando...
        </div>
      </DashboardLayout>
    );
  }

  const nuevosCount = clients?.filter((c) => !c.responsable_id).length ?? 0;

  return (
    <DashboardLayout title="Cartera de clientes">
      {nuevosCount > 0 && (
        <button
          onClick={() => setRespFilter("__unassigned__")}
          className={`w-full text-left mb-4 p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
            respFilter === "__unassigned__"
              ? "bg-status-orangeBg border-status-orange"
              : "bg-white border-slate-200 hover:border-status-orange"
          }`}
        >
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-status-orange" />
            <span className="text-sm font-semibold text-slate-800">
              {nuevosCount} cliente{nuevosCount === 1 ? "" : "s"} nuevo{nuevosCount === 1 ? "" : "s"} sin responsable asignado
            </span>
          </div>
          <span className="text-xs text-status-orange font-medium">Ver y asignar →</span>
        </button>
      )}

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente o RUC/cédula..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">Todos los estados</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">Toda severidad</option>
            <option value="Alto riesgo">Alto riesgo (120-180d)</option>
            <option value="Crítico">Crítico (181-365d)</option>
            <option value="Muy crítico">Muy crítico (+365d)</option>
          </select>
          <select value={respFilter} onChange={(e) => setRespFilter(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">Todos los responsables</option>
            <option value="__unassigned__">Nuevos / sin asignar</option>
            {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="flex-1" />
          <Link to="/clients/new" className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-corporate-blue text-white hover:bg-corporate-blueLight">
            <Plus size={15} /> Nuevo cliente
          </Link>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">#</th>
              <Th label="Cliente" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <th className="px-4 py-3 text-left">RUC/Cédula</th>
              <Th label="Fecha factura" active={sortKey === "fecha_min"} dir={sortDir} onClick={() => toggleSort("fecha_min")} />
              <Th label="Saldo" active={sortKey === "saldo_total"} dir={sortDir} onClick={() => toggleSort("saldo_total")} />
              <Th label="Días mora" active={sortKey === "dias_max"} dir={sortDir} onClick={() => toggleSort("dias_max")} />
              <th className="px-4 py-3 text-left">Severidad</th>
              <th className="px-4 py-3 text-left">Responsable</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, idx) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400 font-semibold">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.name}
                  {c.invoices.length > 1 && <span className="text-slate-400 text-xs"> ({c.invoices.length} facturas)</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.tax_id}</td>
                <td className="px-4 py-3 text-slate-500">{c.fecha_min ? new Date(c.fecha_min).toLocaleDateString("es-EC") : "—"}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{currency(c.saldo_total)}</td>
                <td className="px-4 py-3">
                  <span className={c.dias_max > 365 ? "text-status-maroon font-semibold" : c.dias_max > 180 ? "text-status-red font-semibold" : "text-status-orange font-semibold"}>{c.dias_max}</span>
                </td>
                <td className="px-4 py-3"><Badge text={severidad(c.dias_max)} tone={SEVERIDAD_TONE[severidad(c.dias_max)]} /></td>
                <td className="px-4 py-3">
                  <select
                    value={c.responsable_id ?? ""}
                    onChange={(e) => handleAssignResponsable(c.id, e.target.value)}
                    className={`border rounded-lg text-sm px-2 py-1.5 ${
                      c.responsable_id ? "border-slate-200 text-slate-700" : "border-status-orange text-status-orange font-medium bg-status-orangeBg"
                    }`}
                  >
                    <option value="">Sin asignar</option>
                    {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3"><Badge text={c.estado} tone={ESTADO_TONE[c.estado] ?? "gray"} /></td>
                <td className="px-4 py-3">
                  <Link to={`/clients/${c.id}`} className="text-corporate-blueLight font-medium hover:underline">Ver</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">No se encontraron clientes con los filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-slate-400 mt-3">{rows.length} de {clients.length} clientes</p>
    </DashboardLayout>
  );
}

function Th({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={onClick}>
      <span className={active ? "text-corporate-blue" : ""}>{label} {active ? (dir === "asc" ? "▲" : "▼") : ""}</span>
    </th>
  );
}
