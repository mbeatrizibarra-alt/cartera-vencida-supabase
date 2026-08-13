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
            <p>Filas en el archivo: <strong>{result.totalFilasEnArchivo}</strong></p>
            <p>Filas reconocidas: <strong>{result.filasLeidas}</strong></p>
            <p>Clientes nuevos: <strong className="text-status-green">{result.clientesCreados}</strong></p>
            <p>Clientes modificados: <strong className="text-corporate-blue">{result.clientesActualizados}</strong></p>
            <p>Clientes sin cambios: <strong className="text-slate-500">{result.clientesSinCambios}</strong></p>
            <p>Facturas nuevas: <strong className="text-status-green">{result.facturasCreadas}</strong></p>
            <p>Facturas modificadas: <strong className="text-corporate-blue">{result.facturasActualizadas}</strong></p>
            <p>Facturas sin cambios: <strong className="text-slate-500">{result.facturasSinCambios}</strong></p>
            <p>Filas con error: <strong className="text-status-red">{result.errores.length}</strong></p>
            {result.errores.length > 0 && (
              <ul className="mt-2 text-xs text-status-red list-disc pl-5 max-h-40 overflow-y-auto">
                {result.errores.map((e, idx) => (
                  <li key={idx}>Fila {e.fila}: {e.error}</li>
                ))}
              </ul>
            )}

            {result.filasLeidas === 0 && result.totalFilasEnArchivo > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-status-orangeBg border border-status-orange/30">
                <p className="text-status-orange font-semibold text-sm">
                  No se reconoció ninguna fila. El archivo tenía {result.totalFilasEnArchivo} fila(s), pero
                  ninguna tenía columnas de "Cliente" y "RUC/Cédula" que el sistema pudiera identificar.
                </p>
                <p className="text-xs text-slate-600 mt-2">Columnas detectadas en tu archivo:</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {result.columnasDetectadas.map((col, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Revisa que tu archivo tenga una columna con el nombre del cliente y otra con su RUC o
                  cédula (los nombres pueden variar, pero deben contener esas palabras).
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 pt-2 border-t border-slate-200 mt-2">
              Las actividades, gestiones y documentos ya guardados de cada cliente no se ven afectados por esta carga.
            </p>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
