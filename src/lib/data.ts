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
  // FK PostgREST can use to embed profiles(name) automatically. We fetch the relevant
  // profiles separately (by id) and merge the author name in JS instead.
  const userIds = Array.from(new Set((activities ?? []).map((a) => a.user_id).filter(Boolean)));
  let profilesById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds as string[]);
    if (profErr) throw profErr;
    profilesById = new Map((profiles ?? []).map((p) => [p.id, p.name]));
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
  const { data, error } = await supabase
    .from("activities")
    .insert({ ...payload, user_id: user?.id ?? null })
    .select()
    .single();
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

export { severidad };
