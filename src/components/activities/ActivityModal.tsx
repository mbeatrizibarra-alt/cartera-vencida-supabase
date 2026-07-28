import { useState, FormEvent } from "react";
import { ModalShell } from "../ui/ModalShell";
import { createActivity, uploadDocument } from "../../lib/data";
import { TIPOS_ACTIVIDAD } from "../../types";

export function ActivityModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<string>(TIPOS_ACTIVIDAD[0]);
  const [descripcion, setDescripcion] = useState("");
  const [proximaAccion, setProximaAccion] = useState("");
  const [proximaFecha, setProximaFecha] = useState("");
  const [monto, setMonto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError("Escribe una descripción de la actividad.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const activity = await createActivity({
        client_id: clientId,
        tipo,
        descripcion: descripcion.trim(),
        proxima_accion: proximaAccion || null,
        proxima_fecha: proximaFecha || null,
        monto: tipo === "Pago recibido" && monto ? Number(monto) : null,
      });
      if (file) {
        await uploadDocument(clientId, file, activity.id);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la actividad.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Registrar actividad" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de actividad</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {TIPOS_ACTIVIDAD.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {tipo === "Pago recibido" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto recibido (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">Se usa para el gráfico de recuperación mensual del dashboard.</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Describe lo realizado y el resultado</label>
          <textarea required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Próxima acción (opcional)</label>
            <input value={proximaAccion} onChange={(e) => setProximaAccion(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input type="date" value={proximaFecha} onChange={(e) => setProximaFecha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Adjuntar comprobante de pago u otro documento (opcional)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <button type="submit" disabled={saving} className="w-full bg-corporate-blue text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-corporate-blueLight disabled:opacity-60">
          {saving ? "Guardando..." : "Registrar actividad"}
        </button>
      </form>
    </ModalShell>
  );
}
