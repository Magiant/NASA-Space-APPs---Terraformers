// Pronóstico del tiempo con Open-Meteo (gratis, sin llave). Se pide directo desde el navegador,
// igual que la altura en publico.ts: no pasa por Supabase ni por los extractores.
//
// Se pide con el punto central del distrito elegido (no con el GPS de la persona), redondeado a 2 decimales.
// Sin señal se muestra la última copia guardada en el celular, sin los días y horas que ya pasaron.
import { guardar, leer } from './almacen';

/** Estado del cielo en palabras simples (los nombres están en idiomas/*.ts → tiempo.cielo). */
export type Cielo =
  | 'soleado' | 'despejado' | 'pocoNublado' | 'nublado' | 'niebla'
  | 'llovizna' | 'lluvia' | 'lluviaFuerte' | 'aguaceros' | 'tormenta';

export interface DiaPronostico {
  fecha: string;            // 2026-11-20 (hora local del lugar)
  codigo: number;           // código WMO del día
  max: number | null;       // °C
  min: number | null;       // °C
  lluviaProb: number | null; // probabilidad máxima de lluvia del día (%)
  lluviaMm: number | null;  // lluvia total esperada del día (mm)
}

export interface HoraPronostico {
  hora: string;             // '2026-11-20T14:00' (hora local del lugar)
  temp: number | null;      // °C
  codigo: number;           // código WMO de esa hora
  esDia: boolean;
  lluviaProb: number | null; // %
}

export interface Pronostico {
  pedido: number;           // cuándo se pidió (milisegundos)
  guardado?: boolean;       // true = sin señal: es la última copia guardada
  ahora: { temp: number | null; sensacion: number | null; codigo: number; esDia: boolean; humedad: number | null; viento: number | null };
  horas: HoraPronostico[];  // próximas 24 horas, empezando la hora actual
  dias: DiaPronostico[];    // 7 días, empezando hoy
}

/** Forma de la respuesta de Open-Meteo con las variables que se piden abajo. */
interface Respuesta {
  current?: { temperature_2m: number | null; apparent_temperature: number | null; relative_humidity_2m: number | null; weather_code: number; is_day: number; wind_speed_10m: number | null };
  hourly?: { time: string[]; temperature_2m: (number | null)[]; weather_code: number[]; is_day: number[]; precipitation_probability: (number | null)[] };
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_probability_max: (number | null)[]; precipitation_sum: (number | null)[] };
}

// v2: cada hora trae temperatura y cielo, y cada día la lluvia en mm.
const CLAVE = 'tf-pronosticos-v2';
const VIGENCIA_MS = 30 * 60 * 1000; // se vuelve a pedir cada 30 minutos
const MAX_GUARDADOS = 6;            // últimos lugares consultados (inicio + distritos visitados)

/** Redondea una coordenada a 2 decimales (~1 km). */
export const aproximar = (n: number) => Math.round(n * 100) / 100;

/** Código del tiempo WMO (el que usa Open-Meteo) → estado del cielo. */
export function cieloDe(codigo: number, esDia = true): Cielo {
  if (codigo <= 1) return esDia ? 'soleado' : 'despejado';
  if (codigo === 2) return 'pocoNublado';
  if (codigo === 3) return 'nublado';
  if (codigo === 45 || codigo === 48) return 'niebla';
  if (codigo >= 51 && codigo <= 57) return 'llovizna';
  if (codigo === 65 || codigo === 67 || codigo === 82) return 'lluviaFuerte';
  if (codigo >= 61 && codigo <= 67) return 'lluvia';
  if (codigo === 80 || codigo === 81) return 'aguaceros';
  if (codigo >= 95) return 'tormenta';
  return 'nublado'; // nieve (71–77, 85–86): no se da en Costa Rica
}

/** Hora local del navegador como '2026-11-20T14' (para descartar lo que ya pasó). */
function horaLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 13);
}

async function descargar(lat: number, lng: number): Promise<Pronostico> {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lng}&timezone=auto&forecast_days=7&forecast_hours=24`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m'
    + '&hourly=temperature_2m,weather_code,is_day,precipitation_probability'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum';
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
  const { current: c, hourly: h, daily: d } = (await r.json()) as Respuesta;
  if (!c || !d) throw new Error('Open-Meteo no envió el pronóstico completo');
  return {
    pedido: Date.now(),
    ahora: {
      temp: c.temperature_2m, sensacion: c.apparent_temperature, codigo: c.weather_code,
      esDia: c.is_day === 1, humedad: c.relative_humidity_2m, viento: c.wind_speed_10m,
    },
    horas: (h?.time ?? []).map((hora, i) => ({
      hora, temp: h!.temperature_2m[i] ?? null, codigo: h!.weather_code[i], esDia: h!.is_day[i] === 1,
      lluviaProb: h!.precipitation_probability[i] ?? null,
    })),
    dias: d.time.map((fecha, i) => ({
      fecha, codigo: d.weather_code[i], max: d.temperature_2m_max[i] ?? null, min: d.temperature_2m_min[i] ?? null,
      lluviaProb: d.precipitation_probability_max[i] ?? null, lluviaMm: d.precipitation_sum[i] ?? null,
    })),
  };
}

/**
 * Pronóstico de un lugar. Usa la copia guardada si tiene menos de 30 minutos; si no hay señal,
 * devuelve la última copia (marcada como `guardado`) sin las horas ni los días que ya pasaron.
 */
export async function pedirPronostico(lat: number, lng: number): Promise<Pronostico> {
  const la = aproximar(lat);
  const lo = aproximar(lng);
  const clave = `${la},${lo}`;
  const guardados = leer<Record<string, Pronostico>>(CLAVE, {});
  const previo = guardados[clave];
  if (previo && Date.now() - previo.pedido < VIGENCIA_MS) return previo;
  try {
    const nuevo = await descargar(la, lo);
    const otros = Object.entries(guardados)
      .filter(([k]) => k !== clave)
      .sort(([, a], [, b]) => b.pedido - a.pedido)
      .slice(0, MAX_GUARDADOS - 1);
    guardar(CLAVE, Object.fromEntries([[clave, nuevo], ...otros]));
    return nuevo;
  } catch (e) {
    if (!previo) throw e;
    const ahora = horaLocal();
    const dias = previo.dias.filter((d) => d.fecha >= ahora.slice(0, 10));
    if (!dias.length) throw e;
    return { ...previo, guardado: true, dias, horas: previo.horas.filter((h) => h.hora.slice(0, 13) >= ahora) };
  }
}
