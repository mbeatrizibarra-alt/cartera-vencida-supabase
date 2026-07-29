import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { importExcel, ExcelImportResult } from "../lib/data";

type Mode = "actualizar" | "reemplazar";

const MODE_INFO: Record<Mode, { label: string; description: string }> = {
  actualizar: {
    label: "Actualizar",
    description: "Actualiza los clientes/facturas existentes (por RUC y N° de factura) y crea los nuevos. No afecta el resto de la cartera.",
  },
  reemplazar: {
    label: "Reemplazar",
    description: "Desactiva toda la cartera actual (se conserva el historial, solo deja de mostrarse) y carga el archivo como cartera vigente.",
  },
};

export default function ExcelImport() {
  const [mode, setMode] = useState<Mode>("actualizar");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) return;
    if (mode === "reemplazar" && !confirm("Esto desactivará toda la cartera actual antes de cargar el archivo. ¿Continuar?")) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await importExcel(file, mode);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar el archivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Cargar Excel">
      <Card className="p-6 max-w-2xl">
        <h3 className="font-semibold text-slate-800 mb-1">Actualizar cartera desde Excel</h3>
        <p className="text-sm text-slate-500 mb-4">
          Columnas esperadas: Cliente, RUC/Cédula, Número de factura, Fecha factura, Días de mora, Monto
          original, Saldo pendiente, Correo, Teléfono, Observaciones. El orden de las columnas no importa,
          y los nombres pueden variar ligeramente (mayúsculas/tildes).
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-left p-3 rounded-lg border text-sm ${
                mode === m ? "border-corporate-blue bg-blue-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="font-semibold text-slate-800">{MODE_INFO[m].label}</p>
              <p className="text-xs text-slate-500 mt-1">{MODE_INFO[m].description}</p>
            </button>
          ))}
        </div>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 mb-4"
        />

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="flex items-center gap-2 bg-corporate-blue text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-corporate-blueLight disabled:opacity-60"
        >
          <UploadCloud size={16} />
          {loading ? "Procesando..." : "Cargar archivo"}
        </button>

        {error && <p className="text-sm text-status-red mt-4">{error}</p>}

        {result && (
          <div className="mt-5 p-4 rounded-lg bg-slate-50 text-sm space-y-1">
            <p>Filas leídas: <strong>{result.filasLeidas}</strong></p>
            <p>Clientes creados: <strong className="text-status-green">{result.clientesCreados}</strong></p>
            <p>Clientes actualizados: <strong className="text-corporate-blue">{result.clientesActualizados}</strong></p>
            <p>Facturas creadas: <strong className="text-status-green">{result.facturasCreadas}</strong></p>
            <p>Facturas actualizadas: <strong className="text-corporate-blue">{result.facturasActualizadas}</strong></p>
            <p>Filas con error: <strong className="text-status-red">{result.errores.length}</strong></p>
            {result.errores.length > 0 && (
              <ul className="mt-2 text-xs text-status-red list-disc pl-5 max-h-40 overflow-y-auto">
                {result.errores.map((e, idx) => (
                  <li key={idx}>Fila {e.fila}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
