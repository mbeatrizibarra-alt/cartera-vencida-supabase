import { useState, FormEvent } from "react";
import { ModalShell } from "../ui/ModalShell";
import { createActivity, updateActivity, uploadDocument, getDocumentUrl } from "../../lib/data";
import { TIPOS_ACTIVIDAD, Activity, DocumentRow } from "../../types";

export function ActivityModal({
  clientId,
  activity,
  existingDocuments = [],
  onClose,
  onSaved,
}: {
  clientId: string;
  /** Si se pasa, el modal edita esta actividad en vez de crear una nueva. */
  activity?: Activity;
  /** Documentos ya adjuntos a esta actividad (para poder verlos/descargarlos al editar). */
  existingDocuments?: DocumentRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!activity;
  const [tipo, setTipo] = useState<string>(activity?.tipo ?? TIPOS_ACTIVIDAD[0]);
  const [descripcion, setDescripcion] = useState(activity?.descripcion ?? "");
  const [proximaAccion, setProximaAccion] = useState(activity?.proxima_accion ?? "");
  const [proximaFecha, setProximaFecha] = useState(activity?.proxima_fecha ?? "");
  const [monto, setMonto] = useState(activity?.monto != null ? String(activity.monto) : "");
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
      const payload = {
        tipo,
        descripcion: descripcion.trim(),
        proxima_accion: proximaAccion || null,
        proxima_fecha: proximaFecha || null,
        monto: tipo === "Pago recibido" && monto ? Number(monto) : null,
      };
      let activityId = activity?.id;
      if (isEdit && activity) {
        await updateActivity(activity.id, payload);
      } else {
        const created = await createActivity({ client_id: clientId, ...payload });
        activityId = created.id;
      }
      if (file && activityId) {
        await uploadDocument(clientId, file, activityId);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la actividad.");
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(doc: DocumentRow) {
    const url = await getDocumentUrl(doc.storage_path);
    window.open(url, "_blank");
  }

  return (
    <ModalShell title={isEdit ? "Editar actividad" : "Registrar actividad"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEdit && (
          <p className="text-xs text-slate-400 -mt-1">
            {new Date(activity.created_at).toLocaleString("es-EC")}
            {activity.autor_nombre ? ` · ${activity.autor_nombre}` : ""}
          </p>
        )}
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
            <input type="date" value={proximaFecha ?? ""} onChange={(e) => setProximaFecha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {isEdit && existingDocuments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Documentos ya adjuntos</label>
            <ul className="space-y-1">
              {existingDocuments.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => openDocument(d)} className="text-xs text-corporate-blueLight hover:underline">
                    📎 {d.file_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {isEdit ? "Adjuntar otro documento (opcional)" : "Adjuntar comprobante de pago u otro documento (opcional)"}
          </label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <button type="submit" disabled={saving} className="w-full bg-corporate-blue text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-corporate-blueLight disabled:opacity-60">
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Registrar actividad"}
        </button>
      </form>
    </ModalShell>
  );
}
