import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { createClient, upsertInvoices, fetchResponsables } from "../lib/data";
import { Responsable, calcularDiasMora } from "../types";

export default function ClientNew() {
  const navigate = useNavigate();
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [respId, setRespId] = useState("");
  const [saldo, setSaldo] = useState("0");
  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 121);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResponsables().then(setResponsables);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const client = await createClient({ name, tax_id: taxId, responsable_id: respId || null });
      await upsertInvoices(client.id, [
        { numero: "", fecha, saldo: Number(saldo) || 0, dias_mora: calcularDiasMora(fecha), condicion: "" },
      ]);
      navigate(`/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title="Nuevo cliente">
      <Card className="p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Razón social</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RUC / Cédula</label>
            <input required value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Saldo pendiente</label>
              <input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de la factura</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-slate-400 mt-1">Los días de mora se calculan solos a partir de esta fecha ({calcularDiasMora(fecha)} días hoy).</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
            <select value={respId} onChange={(e) => setRespId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Sin asignar</option>
              {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <button type="submit" disabled={saving} className="bg-corporate-blue text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-corporate-blueLight disabled:opacity-60">
            {saving ? "Guardando..." : "Crear cliente"}
          </button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
