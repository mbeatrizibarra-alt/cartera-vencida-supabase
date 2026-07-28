import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Phone, Mail, IdCard, Plus, Download, Loader2 } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ActivityModal } from "../components/activities/ActivityModal";
import { fetchClientDetail, updateClient, upsertInvoices, fetchResponsables, getDocumentUrl } from "../lib/data";
import { Client, Invoice, Activity, DocumentRow, Responsable, ESTADOS, ESTADO_TONE, SEVERIDAD_TONE, severidad } from "../types";

const currency = (v: number) => v.toLocaleString("es-EC", { style: "currency", currency: "USD" });
const TABS = ["General", "Facturas", "Actividades", "Documentos"] as const;

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<(Client & { responsables: { name: string } | null }) | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("General");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editInvoices, setEditInvoices] = useState<Partial<Invoice>[]>([]);

  const reload = useCallback(async () => {
    if (!id) return;
    const [detail, resp] = await Promise.all([fetchClientDetail(id), fetchResponsables()]);
    setClient(detail.client);
    setInvoices(detail.invoices);
    setActivities(detail.activities);
    setDocuments(detail.documents);
    setEditInvoices(detail.invoices);
    setResponsables(resp);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleFieldChange(field: keyof Client, value: string) {
    if (!id || !client) return;
    await updateClient(id, { [field]: value || null } as Partial<Client>);
    reload();
  }

  async function saveInvoices() {
    if (!id) return;
    await upsertInvoices(id, editInvoices);
    reload();
  }

  const saldoTotal = editInvoices.reduce((s, i) => s + Number(i.saldo || 0), 0);
  const diasMax = editInvoices.length ? Math.max(...editInvoices.map((i) => Number(i.dias_mora || 0))) : 0;

  if (!client) {
    return (
      <DashboardLayout title="Cliente">
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={client.name}>
      <Card className="p-5 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><IdCard size={14} /> {client.tax_id}</span>
              {client.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {client.email}</span>}
              {client.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {client.phone}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select value={client.estado} onChange={(e) => handleFieldChange("estado", e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-1.5">
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Badge text={client.estado} tone={ESTADO_TONE[client.estado] ?? "gray"} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          <Stat label="Saldo total" value={currency(saldoTotal)} />
          <Stat label="Días de mora (máx.)" value={String(diasMax)} />
          <Stat label="Severidad" value={severidad(diasMax)} />
          <div>
            <p className="text-xs text-slate-500 mb-1">Responsable</p>
            <select
              value={client.responsable_id ?? ""}
              onChange={(e) => handleFieldChange("responsable_id", e.target.value)}
              className="border border-slate-300 rounded-lg text-sm px-2 py-1 w-full"
            >
              <option value="">Sin asignar</option>
              {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <button onClick={() => setShowActivityModal(true)} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-corporate-blue text-white hover:bg-corporate-blueLight mt-5">
          <Plus size={15} /> Registrar actividad
        </button>
      </Card>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-corporate-blue text-corporate-blue" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "General" && (
        <Card className="p-5 text-sm text-slate-700">
          <label className="block font-semibold mb-2">Observaciones</label>
          <textarea
            defaultValue={client.observaciones ?? ""}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            onBlur={(e) => handleFieldChange("observaciones", e.target.value)}
          />
        </Card>
      )}

      {tab === "Facturas" && (
        <Card className="p-4">
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-3 py-2 text-left">N° documento</th><th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Saldo</th><th className="px-3 py-2 text-left">Días mora</th><th></th>
              </tr>
            </thead>
            <tbody>
              {editInvoices.map((inv, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2"><input value={inv.numero ?? ""} onChange={(e) => setEditInvoices((prev) => prev.map((p, i) => i === idx ? { ...p, numero: e.target.value } : p))} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2"><input type="date" value={inv.fecha ?? ""} onChange={(e) => setEditInvoices((prev) => prev.map((p, i) => i === idx ? { ...p, fecha: e.target.value } : p))} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={inv.saldo ?? 0} onChange={(e) => setEditInvoices((prev) => prev.map((p, i) => i === idx ? { ...p, saldo: Number(e.target.value) } : p))} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2"><input type="number" value={inv.dias_mora ?? 0} onChange={(e) => setEditInvoices((prev) => prev.map((p, i) => i === idx ? { ...p, dias_mora: Number(e.target.value) } : p))} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2">
                    <button onClick={() => setEditInvoices((prev) => prev.filter((_, i) => i !== idx))} className="text-status-red text-xs">Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button onClick={() => setEditInvoices((prev) => [...prev, { numero: "", fecha: new Date().toISOString().slice(0, 10), saldo: 0, dias_mora: diasMax || 120, condicion: "" }])} className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">+ Agregar factura</button>
            <button onClick={saveInvoices} className="text-sm px-3 py-1.5 rounded-lg bg-corporate-blue text-white hover:bg-corporate-blueLight">Guardar facturas</button>
          </div>
        </Card>
      )}

      {tab === "Actividades" && (
        <Card className="p-5">
          <ol className="relative border-l-2 border-slate-200 ml-2 space-y-6">
            {activities.map((a) => (
              <li key={a.id} className="ml-4">
                <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-corporate-blueLight border-2 border-white" />
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString("es-EC")} {a.autor_nombre ? `· ${a.autor_nombre}` : ""}</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5"><strong>{a.tipo}:</strong> {a.descripcion}</p>
                {a.proxima_accion && <p className="text-xs text-slate-500 mt-1">Próxima acción: {a.proxima_accion}{a.proxima_fecha ? ` (${new Date(a.proxima_fecha).toLocaleDateString("es-EC")})` : ""}</p>}
                {documents.filter((d) => d.activity_id === a.id).map((d) => (
                  <DocLink key={d.id} doc={d} />
                ))}
              </li>
            ))}
            {activities.length === 0 && <p className="text-slate-400 text-sm">Aún no hay actividades registradas.</p>}
          </ol>
        </Card>
      )}

      {tab === "Documentos" && (
        <Card className="divide-y divide-slate-100">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-slate-800">{d.file_name}</p>
              <DocLink doc={d} showLabel />
            </div>
          ))}
          {documents.length === 0 && <p className="px-4 py-8 text-center text-slate-400 text-sm">No hay documentos cargados para este cliente.</p>}
        </Card>
      )}

      {showActivityModal && (
        <ActivityModal clientId={client.id} onClose={() => setShowActivityModal(false)} onSaved={() => { setShowActivityModal(false); reload(); }} />
      )}
    </DashboardLayout>
  );
}

function DocLink({ doc, showLabel = false }: { doc: DocumentRow; showLabel?: boolean }) {
  async function open() {
    const url = await getDocumentUrl(doc.storage_path);
    window.open(url, "_blank");
  }
  return (
    <button onClick={open} className="flex items-center gap-1.5 text-xs text-corporate-blueLight hover:underline mt-1">
      <Download size={12} /> {showLabel ? "Descargar" : `📎 ${doc.file_name}`}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
