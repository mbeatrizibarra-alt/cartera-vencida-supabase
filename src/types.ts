export const ESTADOS = [
  "Sin gestión","Primera llamada","Segunda llamada","Correo enviado","WhatsApp enviado",
  "Carta de cobro enviada","Cliente respondió","Cliente solicita convenio","Convenio enviado",
  "Convenio firmado","Promesa de pago","Pago parcial","Pagado","En conciliación",
  "En revisión administrativa","Proceso legal","Cobro judicial","Incobrable","Caso cerrado"
] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_TONE: Record<string, "green"|"orange"|"red"|"gray"|"blue"> = {
  "Pagado":"green","Promesa de pago":"orange","Pago parcial":"orange","Convenio firmado":"blue",
  "Convenio enviado":"orange","Cliente solicita convenio":"blue","Cliente respondió":"blue",
  "Sin gestión":"gray","Primera llamada":"orange","Segunda llamada":"orange","Correo enviado":"orange",
  "WhatsApp enviado":"orange","Carta de cobro enviada":"orange","En conciliación":"blue",
  "En revisión administrativa":"blue","Proceso legal":"red","Cobro judicial":"red",
  "Incobrable":"red","Caso cerrado":"gray"
};

export const TIPOS_ACTIVIDAD = [
  "Llamada","Correo","WhatsApp","Visita","Reunión","Carta","Notificación",
  "Convenio","Pago recibido","Proceso legal","Otro"
] as const;

export function severidad(dias: number): "Alto riesgo"|"Crítico"|"Muy crítico" {
  if (dias > 365) return "Muy crítico";
  if (dias > 180) return "Crítico";
  return "Alto riesgo";
}
export const SEVERIDAD_TONE: Record<string, "orange"|"red"|"maroon"> = {
  "Alto riesgo":"orange","Crítico":"red","Muy crítico":"maroon"
};

export interface Responsable { id: string; name: string; activo: boolean; }

export interface Invoice {
  id: string;
  client_id: string;
  numero: string;
  fecha: string | null;
  saldo: number;
  dias_mora: number;
  condicion: string | null;
  activo: boolean;
}

export interface Activity {
  id: string;
  client_id: string;
  user_id: string | null;
  tipo: string;
  descripcion: string;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  monto: number | null;
  created_at: string;
  autor_nombre?: string;
}

export interface DocumentRow {
  id: string;
  client_id: string;
  activity_id: string | null;
  storage_path: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  tax_id: string;
  email: string | null;
  phone: string | null;
  observaciones: string | null;
  estado: string;
  responsable_id: string | null;
  activo: boolean;
  pago_por_gestion: boolean | null;
  fecha_pago_reportada: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithAgg extends Client {
  invoices: Invoice[];
  saldo_total: number;
  dias_max: number;
  fecha_min: string | null;
  responsable_nombre?: string | null;
  ultima_actividad?: string | null;
}
