import { supabase } from "./supabaseClient";
import { Client, ClientWithAgg, Invoice, Activity, DocumentRow, Responsable, severidad } from "../types";

export async function fetchResponsables(): Promise<Responsable[]> {
  const { data, error } = await supabase.from("responsables").select("*").eq("activo", true).order("name");
  if (error) throw error;
  return data as Responsable[];
}

/** Trae todos los clientes activos con sus facturas y calcula agregados (saldo, días, severidad) en el cliente. */
export async function fetchClients(): Promise<ClientWithAgg[]> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*, responsables(name)")
    .eq("activo", true);
  if (error) throw error;

  const { data: invoices, error: invErr } = await supabase.from("invoices").select("*").eq("activo", true);
  if (invErr) throw invErr;

  const { data: acts, error: actErr } = await supabase
    .from("activities")
    .select("client_id, created_at")
    .order("created_at", { ascending: false });
  if (actErr) throw actErr;

  const lastActivityByClient = new Map<string, string>();
  for (const a of acts ?? []) {
    if (!lastActivityByClient.has(a.client_id)) lastActivityByClient.set(a.client_id, a.created_at);
  }

  return (clients as (Client & { responsables: { name: string } | null })[]).map((c) => {
    const clientInvoices = (invoices as Invoice[]).filter((i) => i.client_id === c.id);
    const saldo_total = Math.round(clientInvoices.reduce((s, i) => s + Number(i.saldo), 0) * 100) / 100;
    const dias_max = clientInvoices.length ? Math.max(...clientInvoices.map((i) => i.dias_mora)) : 0;
    const fechas = clientInvoices.map((i) => i.fecha).filter(Boolean).sort() as string[];
    return {
      ...c,
      invoices: clientInvoices,
      saldo_total,
      dias_max,
      fecha_min: fechas[0] ?? null,
      responsable_nombre: c.responsables?.name ?? null,
      ultima_actividad: lastActivityByClient.get(c.id) ?? null,
    };
  });
}

export async function fetchClientDetail(id: string) {
  const { data: client, error } = await supabase.from("clients").select("*, responsables(name)").eq("id", id).single();
  if (error) throw error;

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", id)
    .eq("activo", true)
    .order("fecha", { ascending: true });
  if (invErr) throw invErr;

  const { data: activities, error: actErr } = await supabase
    .from("activities")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  if (actErr) throw actErr;

  // activities.user_id references auth.users, not profiles, directly — there is no
  // FK PostgREST can use to embed profiles(nombre) automatically. We fetch the relevant
  // profiles separately (by id) and merge the author name in JS instead. This is wrapped
  // in try/catch so that a schema mismatch in "profiles" (e.g. a renamed/missing column)
  // never blocks the rest of the client detail from loading — worst case, no author name.
  const userIds = Array.from(new Set((activities ?? []).map((a) => a.user_id).filter(Boolean)));
  let profilesById = new Map<string, string>();
  if (userIds.length > 0) {
    try {
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, nombre")
        .in("id", userIds as string[]);
      if (profErr) throw profErr;
      profilesById = new Map((profiles ?? []).map((p) => [p.id, p.nombre]));
    } catch (e) {
      console.warn("No se pudo cargar el nombre del autor de las actividades:", e);
    }
  }

  const { data: documents, error: docErr } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  if (docErr) throw docErr;

  return {
    client: client as Client & { responsables: { name: string } | null },
    invoices: invoices as Invoice[],
    activities: (activities as Activity[]).map((a) => ({
      ...a,
      autor_nombre: a.user_id ? profilesById.get(a.user_id) : undefined,
    })),
    documents: documents as DocumentRow[],
  };
}

export async function createClient(payload: Partial<Client>) {
  const { data, error } = await supabase.from("clients").insert(payload).select().single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, payload: Partial<Client>) {
  const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data as Client;
}

export async function deactivateClient(id: string) {
  const { error } = await supabase.from("clients").update({ activo: false }).eq("id", id);
  if (error) throw error;
}

export async function upsertInvoices(clientId: string, invoices: Partial<Invoice>[]) {
  // Reemplaza todas las facturas del cliente por la lista dada (simple y predecible para edición manual).
  const { error: delErr } = await supabase.from("invoices").delete().eq("client_id", clientId);
  if (delErr) throw delErr;
  if (invoices.length === 0) return;
  const { error } = await supabase.from("invoices").insert(invoices.map((i) => ({ ...i, client_id: clientId })));
  if (error) throw error;
}

export async function createActivity(payload: {
  client_id: string;
  tipo: string;
  descripcion: string;
  proxima_accion?: string | null;
  proxima_fecha?: string | null;
  monto?: number | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Solo se incluye "monto" en el insert cuando realmente tiene un valor, para que la
  // app siga funcionando aunque la columna "monto" todavía no exista en la base de datos
  // (evita romper el registro de actividades que no son de tipo "Pago recibido").
  const { monto, ...rest } = payload;
  const insertPayload: Record<string, unknown> = { ...rest, user_id: user?.id ?? null };
  if (monto !== undefined && monto !== null) insertPayload.monto = monto;

  const { data, error } = await supabase.from("activities").insert(insertPayload).select().single();
  if (error) throw error;
  return data as Activity;
}

/** Recuperación mensual: suma de "monto" en actividades de tipo "Pago recibido", agrupada por mes, últimos 12 meses. */
export async function fetchMonthlyRecovery(): Promise<{ label: string; total: number }[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("activities")
    .select("created_at, monto")
    .eq("tipo", "Pago recibido")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const months: { label: string; total: number; year: number; month: number }[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 12; i++) {
    months.push({
      label: cursor.toLocaleDateString("es-EC", { month: "short", year: "2-digit" }),
      total: 0,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (bucket) bucket.total += Number(row.monto ?? 0);
  }

  return months.map(({ label, total }) => ({ label, total }));
}

export async function uploadDocument(clientId: string, file: File, activityId?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = `${clientId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from("comprobantes").upload(path, file);
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      client_id: clientId,
      activity_id: activityId ?? null,
      storage_path: path,
      file_name: file.name,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRow;
}

export async function getDocumentUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from("comprobantes").createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/** Elimina un documento: borra el archivo del Storage y su registro en la tabla `documents`. */
export async function deleteDocument(id: string, storagePath: string) {
  const { error: storageErr } = await supabase.storage.from("comprobantes").remove([storagePath]);
  if (storageErr) throw storageErr;
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

/** Elimina una actividad registrada por error. Los documentos que quedaron ligados a ella
 * (activity_id) no se borran, solo pierden la referencia (ON DELETE SET NULL en el esquema). */
export async function deleteActivity(id: string) {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw error;
}

/** Edita una actividad ya registrada (por ejemplo, si se escribió mal la descripción o el
 * monto). Igual que en createActivity, "monto" solo se incluye si tiene un valor, para no
 * romper el guardado si la columna aún no existiera en la base de datos. */
export async function updateActivity(
  id: string,
  payload: {
    tipo: string;
    descripcion: string;
    proxima_accion?: string | null;
    proxima_fecha?: string | null;
    monto?: number | null;
  }
) {
  const { monto, ...rest } = payload;
  const updatePayload: Record<string, unknown> = { ...rest };
  if (monto !== undefined) updatePayload.monto = monto;
  const { data, error } = await supabase.from("activities").update(updatePayload).eq("id", id).select().single();
  if (error) throw error;
  return data as Activity;
}

export interface AlreadyPaidClient {
  id: string;
  name: string;
  responsableNombre: string | null;
  saldo: number;
  fechaPrimeraGestion: string | null;
  fechaPagado: string;
  diasDesdeGestion: number | null;
}

export interface AlreadyPaidStats {
  cantidad: number;
  montoTotal: number;
  diasPromedio: number | null;
  detalle: AlreadyPaidClient[];
}

/**
 * Estadística de clientes que ya habían pagado por su cuenta (pago_por_gestion = false):
 * cuánto suman esas facturas y, sobre todo, cuántos días pasaron desde que se registró la
 * PRIMERA gestión de cobro a ese cliente (la primera actividad, sea llamada, correo, etc.)
 * hasta que quedó marcado "Pagado". Sirve para detectar casos donde el cliente ya llevaba
 * mucho tiempo con la gestión abierta antes de que se confirmara/registrara el pago.
 */
export async function fetchAlreadyPaidStats(): Promise<AlreadyPaidStats> {
  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, name, updated_at, responsables(name)")
    .eq("activo", true)
    .eq("estado", "Pagado")
    .eq("pago_por_gestion", false);
  if (cErr) throw cErr;

  const clientList = (clients ?? []) as unknown as { id: string; name: string; updated_at: string; responsables: { name: string } | { name: string }[] | null }[];
  const clientIds = clientList.map((c) => c.id);
  const getResponsableName = (r: { name: string } | { name: string }[] | null) => (Array.isArray(r) ? r[0]?.name : r?.name) ?? null;

  const { data: invoices, error: iErr } = await supabase.from("invoices").select("client_id, saldo").in("client_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  if (iErr) throw iErr;
  const saldoByClient = new Map<string, number>();
  for (const inv of invoices ?? []) saldoByClient.set(inv.client_id, (saldoByClient.get(inv.client_id) ?? 0) + Number(inv.saldo));

  const { data: activities, error: aErr } = await supabase
    .from("activities")
    .select("client_id, created_at")
    .in("client_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: true });
  if (aErr) throw aErr;
  const firstActivityByClient = new Map<string, string>();
  for (const a of activities ?? []) {
    if (!firstActivityByClient.has(a.client_id)) firstActivityByClient.set(a.client_id, a.created_at);
  }

  const detalle: AlreadyPaidClient[] = clientList.map((c) => {
    const fechaPrimeraGestion = firstActivityByClient.get(c.id) ?? null;
    const diasDesdeGestion = fechaPrimeraGestion
      ? Math.max(0, Math.round((new Date(c.updated_at).getTime() - new Date(fechaPrimeraGestion).getTime()) / 86400000))
      : null;
    return {
      id: c.id,
      name: c.name,
      responsableNombre: getResponsableName(c.responsables),
      saldo: saldoByClient.get(c.id) ?? 0,
      fechaPrimeraGestion,
      fechaPagado: c.updated_at,
      diasDesdeGestion,
    };
  });

  const conDias = detalle.filter((d) => d.diasDesdeGestion !== null);
  const diasPromedio = conDias.length ? Math.round(conDias.reduce((s, d) => s + (d.diasDesdeGestion ?? 0), 0) / conDias.length) : null;

  return {
    cantidad: detalle.length,
    montoTotal: detalle.reduce((s, d) => s + d.saldo, 0),
    diasPromedio,
    detalle: detalle.sort((a, b) => b.saldo - a.saldo),
  };
}

export { severidad };

export interface ExcelImportResult {
  filasLeidas: number;
  totalFilasEnArchivo: number;
  clientesCreados: number;
  clientesActualizados: number;
  clientesSinCambios: number;
  facturasCreadas: number;
  facturasActualizadas: number;
  facturasSinCambios: number;
  errores: { fila: number; error: string }[];
  columnasDetectadas: string[];
}

/** Quita tildes, pasa a minúsculas y deja solo letras/números, para que "RUC/Cédula",
 * "ruc - cedula" o "Ruc_Cedula" se reconozcan como lo mismo. */
function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  cliente: ["cliente", "nombrecliente", "razonsocial", "nombre", "clientenombre", "empresa"],
  tercero: ["tercero"],
  taxId: [
    "ruccedula", "ruc", "cedula", "identificacion", "numeroidentificacion", "nit",
    "cedularuc", "rucci", "documentoidentidad", "id", "cifnif", "cif", "nif",
  ],
  numero: [
    "numerodefactura", "nfactura", "factura", "nodefactura", "numerofactura",
    "nrofactura", "documento", "numerodocumento", "comprobante", "ndocumento",
  ],
  fechaFactura: [
    "fechafactura", "fechadelafactura", "fechaemision", "fecha", "fechavencimiento",
    "fechadevencimiento", "fechaemitida",
  ],
  diasMora: ["diasdemora", "diasmora", "mora", "diasvencidos", "diasdevencido"],
  montoOriginal: ["montooriginal", "montofactura", "valorfactura", "montototal", "valor", "importetotal"],
  saldoPendiente: [
    "saldopendiente", "saldo", "saldoadeudado", "valorpendiente", "montopendiente",
    "importependiente", "importevencido",
  ],
  responsable: ["responsablecomercial", "responsable", "gestor", "vendedor", "asesor", "usuariocontacto", "usuario"],
  correo: ["correo", "email", "correoelectronico", "mail"],
  telefono: ["telefono", "celular", "movil", "contacto", "numerotelefono"],
  observaciones: ["observaciones", "observacion", "notas", "comentarios"],
  condicion: ["condicionesdepago", "condiciondepago", "condicionpago", "formadepago", "terminodepago"],
};

function getField(row: Record<string, unknown>, normalizedKeyMap: Map<string, string>, key: keyof typeof HEADER_ALIASES): unknown {
  for (const alias of HEADER_ALIASES[key]) {
    const actualHeader = normalizedKeyMap.get(alias);
    if (actualHeader === undefined) continue;
    const value = row[actualHeader];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function excelDateToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    // fecha serial de Excel
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const parsed = new Date(String(value));
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * Carga/actualiza la cartera desde un archivo Excel, directamente desde el navegador
 * (no hay backend intermedio: se parsea el archivo con SheetJS y se escribe en Supabase).
 * El cliente se identifica por RUC/Cédula; si ya existe se actualiza, si no existe se crea.
 * La factura se identifica por (cliente, número de factura); si ya existe se actualiza el
 * saldo/días de mora, si no existe se crea.
 *
 * El reconocimiento de columnas ignora tildes, mayúsculas y símbolos (espacios, guiones,
 * barras) para tolerar variaciones razonables en los encabezados del Excel.
 *
 * mode "reemplazar": antes de cargar, desactiva (soft delete) toda la cartera actual —
 * se conserva en la base de datos pero deja de mostrarse, y el archivo cargado pasa a ser
 * la cartera vigente.
 */
export async function importExcel(file: File, mode: "actualizar" | "reemplazar"): Promise<ExcelImportResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("El archivo no contiene hojas.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const columnasDetectadas = rows.length > 0 ? Object.keys(rows[0]) : [];
  // Mapa: encabezado normalizado -> encabezado real tal como viene en el archivo.
  const normalizedKeyMap = new Map<string, string>();
  for (const h of columnasDetectadas) normalizedKeyMap.set(normalizeHeader(h), h);

  if (mode === "reemplazar") {
    await supabase.from("invoices").update({ activo: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("clients").update({ activo: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: existingClients, error: ecErr } = await supabase
    .from("clients")
    .select("id, tax_id, name, email, phone, observaciones");
  if (ecErr) throw ecErr;
  const clientByTaxId = new Map((existingClients ?? []).map((c) => [String(c.tax_id).trim(), c]));

  const { data: existingInvoices, error: eiErr } = await supabase
    .from("invoices")
    .select("id, client_id, numero, saldo, dias_mora, fecha, condicion");
  if (eiErr) throw eiErr;
  const invoiceByKey = new Map((existingInvoices ?? []).map((i) => [`${i.client_id}::${i.numero}`, i]));

  const result: ExcelImportResult = {
    filasLeidas: 0,
    totalFilasEnArchivo: rows.length,
    clientesCreados: 0,
    clientesActualizados: 0,
    clientesSinCambios: 0,
    facturasCreadas: 0,
    facturasActualizadas: 0,
    facturasSinCambios: 0,
    errores: [],
    columnasDetectadas,
  };

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    // El campo "Tercero" (usado en algunos formatos de exportación) trae
    // "NOMBRE - CIF/RUC - NOMBRE_COMPLETO" en un solo texto. Se prioriza sobre la
    // columna numérica de CIF/NIF porque Excel puede perder ceros a la izquierda
    // en columnas que interpreta como número (ej. "0993189286001" -> pierde el 0).
    let clienteRaw: unknown = null;
    let taxIdRaw: unknown = null;
    const terceroRaw = getField(row, normalizedKeyMap, "tercero");
    if (terceroRaw) {
      const parts = String(terceroRaw).split(" - ").map((p) => p.trim());
      if (parts.length >= 2 && parts[1]) {
        const p0 = parts[0] ?? "";
        const p2 = parts[2] ?? "";
        clienteRaw = (p2.length > p0.length ? p2 : p0) || p0;
        taxIdRaw = parts[1];
      }
    }
    if (!clienteRaw) clienteRaw = getField(row, normalizedKeyMap, "cliente");
    if (!taxIdRaw) taxIdRaw = getField(row, normalizedKeyMap, "taxId");
    if (!clienteRaw || !taxIdRaw) continue; // fila vacía o irrelevante
    result.filasLeidas++;

    try {
      const taxId = String(taxIdRaw).trim();
      const name = String(clienteRaw).trim();
      const correo = getField(row, normalizedKeyMap, "correo");
      const telefono = getField(row, normalizedKeyMap, "telefono");
      const observaciones = getField(row, normalizedKeyMap, "observaciones");

      const existingClient = clientByTaxId.get(taxId);
      let clientId: string;
      if (!existingClient) {
        const { data: created, error } = await supabase
          .from("clients")
          .insert({
            name,
            tax_id: taxId,
            email: correo ? String(correo) : null,
            phone: telefono ? String(telefono) : null,
            observaciones: observaciones ? String(observaciones) : "",
          })
          .select("id, tax_id, name, email, phone, observaciones")
          .single();
        if (error) throw error;
        clientId = created.id as string;
        clientByTaxId.set(taxId, created);
        result.clientesCreados++;
      } else {
        clientId = existingClient.id;
        // Solo se escribe si algún valor realmente cambió respecto al Excel anterior.
        const nuevoEmail = correo ? String(correo) : existingClient.email;
        const nuevoTelefono = telefono ? String(telefono) : existingClient.phone;
        const nuevasObs = observaciones ? String(observaciones) : existingClient.observaciones;
        const cambioNombre = name !== existingClient.name;
        const cambioEmail = nuevoEmail !== existingClient.email;
        const cambioTelefono = nuevoTelefono !== existingClient.phone;
        const cambioObs = nuevasObs !== existingClient.observaciones;
        if (cambioNombre || cambioEmail || cambioTelefono || cambioObs) {
          const { error } = await supabase
            .from("clients")
            .update({ name, activo: true, email: nuevoEmail, phone: nuevoTelefono, observaciones: nuevasObs })
            .eq("id", clientId);
          if (error) throw error;
          result.clientesActualizados++;
        } else {
          result.clientesSinCambios++;
        }
      }

      const numero = String(getField(row, normalizedKeyMap, "numero") ?? `SIN-NUM-${idx + 2}`);
      const fecha = excelDateToIso(getField(row, normalizedKeyMap, "fechaFactura"));
      const saldoField = getField(row, normalizedKeyMap, "saldoPendiente") ?? getField(row, normalizedKeyMap, "montoOriginal");
      const diasMoraField = getField(row, normalizedKeyMap, "diasMora");
      const condicionRaw = getField(row, normalizedKeyMap, "condicion");
      const condicion = condicionRaw ? String(condicionRaw) : "";

      const key = `${clientId}::${numero}`;
      const existingInvoice = invoiceByKey.get(key);

      if (!existingInvoice) {
        // Factura nueva: si el Excel no trae saldo/días de mora, se calculan/usan valores
        // por defecto razonables (no hay un valor previo que preservar).
        const saldo = saldoField !== null ? Number(saldoField) : 0;
        const diasMora =
          diasMoraField !== null
            ? Number(diasMoraField)
            : fecha
            ? Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000))
            : 0;
        const { error } = await supabase.from("invoices").insert({
          client_id: clientId,
          numero,
          fecha,
          saldo,
          dias_mora: diasMora,
          condicion,
        });
        if (error) throw error;
        invoiceByKey.set(key, { id: "created-this-import", client_id: clientId, numero, saldo, dias_mora: diasMora, fecha, condicion });
        result.facturasCreadas++;
      } else {
        // Factura existente: si el Excel no trae un valor para un campo, se conserva el
        // valor que ya estaba guardado — nunca se sobreescribe con 0 o vacío por accidente.
        const saldo = saldoField !== null ? Number(saldoField) : Number(existingInvoice.saldo);
        const diasMora = diasMoraField !== null ? Number(diasMoraField) : existingInvoice.dias_mora;
        const nuevaFecha = fecha !== null ? fecha : existingInvoice.fecha;
        const nuevaCondicion = condicion !== "" ? condicion : existingInvoice.condicion;

        const cambioSaldo = Number(existingInvoice.saldo) !== saldo;
        const cambioDias = existingInvoice.dias_mora !== diasMora;
        const cambioFecha = existingInvoice.fecha !== nuevaFecha;
        const cambioCondicion = existingInvoice.condicion !== nuevaCondicion;
        if (cambioSaldo || cambioDias || cambioFecha || cambioCondicion) {
          const { error } = await supabase
            .from("invoices")
            .update({ saldo, dias_mora: diasMora, fecha: nuevaFecha, activo: true, condicion: nuevaCondicion })
            .eq("id", existingInvoice.id);
          if (error) throw error;
          result.facturasActualizadas++;
        } else {
          result.facturasSinCambios++;
        }
      }
    } catch (err) {
      result.errores.push({ fila: idx + 2, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}

export interface ResponsableStatsClient {
  id: string;
  name: string;
  saldo: number;
  facturas: number;
  diasResolucion: number | null;
  fechaPagado: string | null;
}

export interface ResponsableStats {
  id: string;
  name: string;
  clientesAsignados: number;
  clientesPagadosTotal: number;
  clientesPagadosPorGestion: number;
  clientesPagadosSinGestion: number;
  facturasRecuperadas: number;
  montoTotalAsignado: number;
  montoRecuperado: number;
  montoRecuperadoPorGestion: number;
  montoRecuperadoSinGestion: number;
  porcentajeRecuperacion: number;
  porcentajeRecuperacionPorGestion: number;
  diasPromedioResolucion: number | null;
  detalleAsignados: ResponsableStatsClient[];
  detallePorGestion: ResponsableStatsClient[];
  detalleSinGestion: ResponsableStatsClient[];
}

/**
 * Estadísticas de desempeño por responsable de cobranza. Se cuenta como "recuperado" el saldo
 * de TODO cliente marcado "Pagado" que tenía asignado ese gestor — sin importar si el pago fue
 * resultado directo de una gestión de cobranza o si el cliente ya había pagado antes y no se
 * había registrado: en ambos casos el gestor dio seguimiento al caso hasta cerrarlo (el cliente
 * no había enviado comprobante hasta que se le insistió), así que la cartera quedó efectivamente
 * resuelta gracias a su trabajo. Se conserva el desglose por motivo (pago_por_gestion) solo como
 * información adicional, no para excluir nada del cálculo principal.
 * - Facturas recuperadas = suma de facturas de todos esos clientes cerrados.
 * - Días promedio de resolución = promedio (updated_at - created_at), como aproximación de
 *   cuánto tardó el gestor en cerrar el caso desde que se le asignó.
 * Incluye el detalle cliente por cliente de cada categoría, para poder mostrarlo al hacer clic
 * en cualquier número del resumen (sin tener que volver a consultar la base de datos).
 */
export async function fetchResponsableStats(): Promise<ResponsableStats[]> {
  const [responsables, clients, invoices] = await Promise.all([
    fetchResponsables(),
    supabase
      .from("clients")
      .select("id, name, responsable_id, estado, pago_por_gestion, created_at, updated_at")
      .eq("activo", true)
      .then((r) => {
        if (r.error) throw r.error;
        return r.data as {
          id: string;
          name: string;
          responsable_id: string | null;
          estado: string;
          pago_por_gestion: boolean | null;
          created_at: string;
          updated_at: string;
        }[];
      }),
    supabase.from("invoices").select("client_id, saldo").eq("activo", true).then((r) => {
      if (r.error) throw r.error;
      return r.data as { client_id: string; saldo: number }[];
    }),
  ]);

  const saldoByClient = new Map<string, number>();
  const invoiceCountByClient = new Map<string, number>();
  for (const inv of invoices) {
    saldoByClient.set(inv.client_id, (saldoByClient.get(inv.client_id) ?? 0) + Number(inv.saldo));
    invoiceCountByClient.set(inv.client_id, (invoiceCountByClient.get(inv.client_id) ?? 0) + 1);
  }

  const toDetail = (c: { id: string; name: string; created_at: string; updated_at: string; estado: string }): ResponsableStatsClient => {
    const diasResolucion =
      c.estado === "Pagado" ? Math.max(0, Math.round((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000)) : null;
    return {
      id: c.id,
      name: c.name,
      saldo: saldoByClient.get(c.id) ?? 0,
      facturas: invoiceCountByClient.get(c.id) ?? 0,
      diasResolucion,
      fechaPagado: c.estado === "Pagado" ? c.updated_at : null,
    };
  };

  return responsables.map((r) => {
    const asignados = clients.filter((c) => c.responsable_id === r.id);
    const pagados = asignados.filter((c) => c.estado === "Pagado");
    // El desglose por motivo es solo informativo — ambos grupos cuentan igual para el desempeño.
    const pagadosPorGestion = pagados.filter((c) => c.pago_por_gestion !== false);
    const pagadosSinGestion = pagados.filter((c) => c.pago_por_gestion === false);

    const montoTotalAsignado = asignados.reduce((s, c) => s + (saldoByClient.get(c.id) ?? 0), 0);
    const montoRecuperado = pagados.reduce((s, c) => s + (saldoByClient.get(c.id) ?? 0), 0);
    const montoRecuperadoPorGestion = pagadosPorGestion.reduce((s, c) => s + (saldoByClient.get(c.id) ?? 0), 0);
    const montoRecuperadoSinGestion = pagadosSinGestion.reduce((s, c) => s + (saldoByClient.get(c.id) ?? 0), 0);
    const facturasRecuperadas = pagados.reduce((s, c) => s + (invoiceCountByClient.get(c.id) ?? 0), 0);

    const dias = pagados.map((c) => {
      const ms = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
      return Math.max(0, Math.round(ms / 86400000));
    });
    const diasPromedioResolucion = dias.length ? Math.round(dias.reduce((s, d) => s + d, 0) / dias.length) : null;

    return {
      id: r.id,
      name: r.name,
      clientesAsignados: asignados.length,
      clientesPagadosTotal: pagados.length,
      clientesPagadosPorGestion: pagadosPorGestion.length,
      clientesPagadosSinGestion: pagadosSinGestion.length,
      facturasRecuperadas,
      montoTotalAsignado,
      montoRecuperado,
      montoRecuperadoPorGestion,
      montoRecuperadoSinGestion,
      porcentajeRecuperacion: montoTotalAsignado > 0 ? Math.round((montoRecuperado / montoTotalAsignado) * 1000) / 10 : 0,
      porcentajeRecuperacionPorGestion: montoTotalAsignado > 0 ? Math.round((montoRecuperadoPorGestion / montoTotalAsignado) * 1000) / 10 : 0,
      diasPromedioResolucion,
      detalleAsignados: asignados.map(toDetail).sort((a, b) => b.saldo - a.saldo),
      detallePorGestion: pagadosPorGestion.map(toDetail).sort((a, b) => b.saldo - a.saldo),
      detalleSinGestion: pagadosSinGestion.map(toDetail).sort((a, b) => b.saldo - a.saldo),
    };
  });
}
