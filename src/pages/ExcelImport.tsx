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
      <Card className="p-7 max-w-2xl">
        <span className="ac-eyebrow block mb-2">Actualización de cartera</span>
        <h3 className="ac-display m-0 mb-2.5" style={{ fontSize: 18, textTransform: "uppercase", letterSpacing: ".04em" }}>
          Cargar Excel
        </h3>
        <p className="mb-6" style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Columnas esperadas: Cliente, RUC/Cédula, Número de factura, Fecha factura, Días de mora, Monto
          original, Saldo pendiente, Correo, Teléfono, Observaciones. El orden de las columnas no importa,
          y los nombres pueden variar ligeramente (mayúsculas/tildes).
        </p>

        {/* Selector de modo: la tarjeta activa se HUNDE (neomorfismo), la inactiva
            queda extruida. Es la señal de estado más clara sobre esta superficie. */}
        <p className="ac-label mb-3">¿Qué quieres hacer con este archivo?</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => {
            const activo = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="text-left p-4 relative overflow-hidden"
                style={{
                  border: "none",
                  borderRadius: 16,
                  background: "var(--neu)",
                  boxShadow: activo ? "var(--neu-inset-sm)" : "var(--neu-raised-sm)",
                }}
              >
                {activo && (
                  <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: m === "reemplazar" ? "var(--ac-orange)" : "var(--ac-blue)" }} />
                )}
                <p
                  className="m-0 flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 13.5,
                    color: activo ? (m === "reemplazar" ? "var(--ac-orange-600)" : "var(--ac-blue)") : "var(--ink)",
                    paddingLeft: activo ? 8 : 0,
                  }}
                >
                  {MODE_INFO[m].label}
                  {activo && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-mute)" }}>· seleccionado</span>}
                </p>
                <p className="m-0 mt-1.5" style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--ink-soft)", paddingLeft: activo ? 8 : 0 }}>
                  {MODE_INFO[m].description}
                </p>
              </button>
            );
          })}
        </div>

        <label className="ac-label block mb-2.5">Archivo</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="ac-field mb-5"
          style={{ fontSize: 12.5, padding: "12px 14px" }}
        />

        <button onClick={handleImport} disabled={!file || loading} className="ac-btn ac-btn-primary" style={{ opacity: !file || loading ? 0.6 : 1 }}>
          <UploadCloud size={16} />
          {loading ? "Procesando..." : "Cargar archivo"}
        </button>

        {error && <p className="mt-4" style={{ fontSize: 13, color: "var(--ac-red)" }}>{error}</p>}

        {result && (
          <div className="mt-6 p-5" style={{ borderRadius: 16, boxShadow: "var(--neu-inset-sm)", fontSize: 13 }}>
            <ResultRow label="Filas en el archivo" value={result.totalFilasEnArchivo} />
            <ResultRow label="Filas reconocidas" value={result.filasLeidas} />
            <ResultRow label="Clientes nuevos" value={result.clientesCreados} color="var(--ac-green)" />
            <ResultRow label="Clientes modificados" value={result.clientesActualizados} color="var(--ac-blue)" />
            <ResultRow label="Clientes sin cambios" value={result.clientesSinCambios} color="var(--ink-mute)" />
            <ResultRow label="Facturas nuevas" value={result.facturasCreadas} color="var(--ac-green)" />
            <ResultRow label="Facturas modificadas" value={result.facturasActualizadas} color="var(--ac-blue)" />
            <ResultRow label="Facturas sin cambios" value={result.facturasSinCambios} color="var(--ink-mute)" />
            <ResultRow label="Filas con error" value={result.errores.length} color={result.errores.length > 0 ? "var(--ac-red)" : "var(--ink-mute)"} last />

            {result.errores.length > 0 && (
              <ul className="mt-3 pl-5 max-h-40 overflow-y-auto" style={{ fontSize: 11.5, color: "var(--ac-red)", listStyle: "disc" }}>
                {result.errores.map((e, idx) => (
                  <li key={idx}>Fila {e.fila}: {e.error}</li>
                ))}
              </ul>
            )}

            {result.filasLeidas === 0 && result.totalFilasEnArchivo > 0 && (
              <div className="mt-4 p-4 relative overflow-hidden" style={{ borderRadius: 14, background: "var(--ac-amber-bg)" }}>
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "var(--ac-amber)" }} />
                <p className="m-0" style={{ paddingLeft: 10, fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "#9C5A12" }}>
                  No se reconoció ninguna fila. El archivo tenía {result.totalFilasEnArchivo} fila(s), pero
                  ninguna tenía columnas de "Cliente" y "RUC/Cédula" que el sistema pudiera identificar.
                </p>
                <p className="m-0 mt-2.5" style={{ paddingLeft: 10, fontSize: 11.5, color: "var(--ink-soft)" }}>Columnas detectadas en tu archivo:</p>
                <div className="flex flex-wrap gap-1.5 mt-2" style={{ paddingLeft: 10 }}>
                  {result.columnasDetectadas.map((col, idx) => (
                    <span key={idx} className="px-2.5 py-1" style={{ background: "var(--neu)", borderRadius: 999, fontSize: 11, color: "var(--ink)", boxShadow: "var(--neu-raised-sm)" }}>
                      {col}
                    </span>
                  ))}
                </div>
                <p className="m-0 mt-2.5" style={{ paddingLeft: 10, fontSize: 11.5, color: "var(--ink-soft)" }}>
                  Revisa que tu archivo tenga una columna con el nombre del cliente y otra con su RUC o
                  cédula (los nombres pueden variar, pero deben contener esas palabras).
                </p>
              </div>
            )}

            <p className="mt-4 pt-3 m-0" style={{ borderTop: "1px solid var(--line)", fontSize: 11.5, color: "var(--ink-mute)" }}>
              Las actividades, gestiones y documentos ya guardados de cada cliente no se ven afectados por esta carga.
            </p>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

function ResultRow({ label, value, color, last = false }: { label: string; value: number; color?: string; last?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-2" style={{ borderBottom: last ? "none" : "1px solid var(--line-soft)" }}>
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <strong className="ac-num" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: color ?? "var(--ac-navy)" }}>{value}</strong>
    </div>
  );
}
