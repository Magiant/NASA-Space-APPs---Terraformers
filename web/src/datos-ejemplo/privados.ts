// DATOS DE EJEMPLO de usuarios, para la demo mientras no estén las tablas de Supabase.
// Las contraseñas aquí son solo de demostración; con Supabase Auth nunca se guardan en la web.
import type { ElementoFinca, Finca, ReportePlaga, Seguimiento, Siembra, Usuario, VueloDron } from '../tipos';
import { clave, usosNoAgricolas } from '../logica/elementosFinca';

export interface UsuarioDemo extends Usuario {
  clave: string;
}

export interface BaseDemo {
  usuarios: UsuarioDemo[];
  fincas: Finca[];
  siembras: Siembra[];
  seguimiento: Seguimiento[];
  reportes: ReportePlaga[];
  vuelos: VueloDron[];
}

/** Cuadrícula de NDVI de ejemplo (0 = suelo desnudo, 1 = plantas muy sanas). */
function cuadricula(filas: number, cols: number, base: number, manchas: [number, number][]): number[][] {
  return Array.from({ length: filas }, (_, f) =>
    Array.from({ length: cols }, (_, c) => {
      const cerca = manchas.some(([mf, mc]) => Math.abs(mf - f) + Math.abs(mc - c) <= 1);
      const ruido = ((f * 7 + c * 13) % 10) / 100;
      return Math.round((cerca ? base - 0.38 + ruido : base + ruido) * 100) / 100;
    }),
  );
}

/**
 * NDVI de ejemplo para fincas grandes: una base con variación suave, manchas con estrés
 * [fila, columna, radio, cuánto baja] y valores propios para agua, bosque y construcciones.
 */
function campo(filas: number, cols: number, base: number, semilla: number, manchas: [number, number, number, number][], elementos: ElementoFinca[] = []): number[][] {
  const usos = usosNoAgricolas(elementos, filas, cols);
  return Array.from({ length: filas }, (_, f) =>
    Array.from({ length: cols }, (_, c) => {
      const u = usos.get(clave(f, c));
      if (u) return u.tipo === 'bosque' ? 0.86 : u.tipo === 'lago' || u.tipo === 'rio' ? -0.05 : 0.12;
      let v = base + 0.05 * Math.sin(f * 0.7 + semilla) * Math.cos(c * 0.5 + semilla * 2) + (((f * 7 + c * 13 + semilla) % 10) - 5) / 100;
      for (const [mf, mc, r, caida] of manchas) {
        const d = Math.hypot(f - mf, c - mc);
        if (d < r) v -= caida * (1 - d / r);
      }
      return Math.round(Math.max(0.05, Math.min(0.92, v)) * 100) / 100;
    }),
  );
}

/** Vuelo con el promedio y el % de estrés sacados de la cuadrícula (sin agua, bosque ni construcciones). */
function vuelo(id: string, finca_id: string, fecha: string, pendiente_pct: number, cuadricula: number[][], elementos?: ElementoFinca[]): VueloDron {
  const usos = usosNoAgricolas(elementos, cuadricula.length, cuadricula[0].length);
  const cultivo = cuadricula.flatMap((fila, f) => fila.filter((_, c) => !usos.has(clave(f, c))));
  const promedio = cultivo.reduce((a, b) => a + b, 0) / cultivo.length;
  const estres = (cultivo.filter((n) => n < 0.6).length / cultivo.length) * 100;
  return {
    id, finca_id, fecha, pendiente_pct, cuadricula,
    ndvi_promedio: Math.round(promedio * 100) / 100,
    area_estres_pct: Math.round(estres),
    ...(elementos ? { elementos } : {}),
  };
}

// Elementos de cada finca (coordenadas en parcelas: x = columna, y = fila).
const ESPERANZA: ElementoFinca[] = [
  { tipo: 'casa', en: [0.5, 0.5] },
  { tipo: 'camino', puntos: [[0.5, 0.9], [3, 1.1], [8, 0.9]] },
  { tipo: 'quebrada', puntos: [[7.6, 0], [7.2, 2.5], [7.7, 4.5], [7.4, 6]], nombre: 'Quebrada Honda' },
];
const RIO_CLARO: ElementoFinca[] = [
  { tipo: 'rio', puntos: [[0, 9], [4, 8.2], [8, 9.5], [12, 8.6], [16, 10], [20, 9.2]], nombre: 'Río Peñas Blancas' },
  { tipo: 'quebrada', puntos: [[11, 0], [11.5, 3], [10.5, 6], [12, 8.6]] },
  { tipo: 'camino', puntos: [[0, 2], [6, 2.5], [10, 2], [20, 1.5]] },
  { tipo: 'bosque', puntos: [[13, 10.8], [20, 10.4], [20, 14], [13.5, 14]] },
  { tipo: 'casa', en: [3.5, 1.2] },
  { tipo: 'bodega', en: [5.5, 1.3] },
  { tipo: 'pozo', en: [2.4, 3.6] },
];
const LAS_NUBES: ElementoFinca[] = [
  { tipo: 'quebrada', puntos: [[0, 3], [5, 4], [9, 3.5], [14, 5]] },
  { tipo: 'naciente', en: [1.5, 8.5] },
  { tipo: 'lago', puntos: [[9, 6.8], [12, 6.5], [12.6, 8.8], [9.6, 9.3]] },
  { tipo: 'invernadero', puntos: [[4.5, 6.6], [7.5, 6.6], [7.5, 9.4], [4.5, 9.4]] },
  { tipo: 'casa', en: [2.2, 0.8] },
  { tipo: 'tanque', en: [3.5, 0.8] },
];
const VALLE_VERDE: ElementoFinca[] = [
  { tipo: 'rio', puntos: [[0, 17.4], [8, 17.1], [16, 17.6], [24, 17.2]], nombre: 'Río Toro Amarillo' },
  { tipo: 'canal', puntos: [[0, 6], [24, 6]] },
  { tipo: 'canal', puntos: [[0, 12], [24, 12]] },
  { tipo: 'camino', puntos: [[12, 0], [12, 16.6]] },
  { tipo: 'bosque', puntos: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  { tipo: 'casa', en: [13.2, 0.8] },
  { tipo: 'bodega', en: [10.8, 0.8] },
  { tipo: 'pozo', en: [6.5, 5.4] },
];

export const BASE_INICIAL: BaseDemo = {
  usuarios: [
    { id: 'u-agri', nombre: 'Ana Solano', correo: 'agricultor@demo.cr', clave: 'demo1234', rol: 'agricultor', codigo_distrito: 'CR30101', creado: '2026-10-02' },
    { id: 'u-tec', nombre: 'Luis Brenes', correo: 'tecnico@demo.cr', clave: 'demo1234', rol: 'tecnico', codigo_distrito: 'CR30101', creado: '2026-10-05' },
    { id: 'u-admin', nombre: 'Equipo Terraformes', correo: 'admin@demo.cr', clave: 'demo1234', rol: 'admin', codigo_distrito: null, creado: '2026-10-01' },
    { id: 'u-agri2', nombre: 'Carlos Mora', correo: 'carlos@demo.cr', clave: 'demo1234', rol: 'agricultor', codigo_distrito: 'CR21001', creado: '2026-10-20' },
  ],
  fincas: [
    { id: 'f1', usuario_id: 'u-agri', nombre: 'La Esperanza', codigo_distrito: 'CR30101', area_ha: 2.5, fuente_agua: 'rio', riego: true, suelo: 'volcanico', creado: '2026-10-02' },
    { id: 'f2', usuario_id: 'u-agri', nombre: 'El Alto', codigo_distrito: 'CR30108', area_ha: 1.2, fuente_agua: 'lluvia', riego: false, suelo: 'no_se', creado: '2026-10-10' },
    { id: 'f3', usuario_id: 'u-agri2', nombre: 'Finca Mora', codigo_distrito: 'CR21001', area_ha: 4, fuente_agua: 'pozo', riego: true, suelo: 'arcilloso', creado: '2026-10-20' },
    { id: 'f4', usuario_id: 'u-agri', nombre: 'Río Claro', codigo_distrito: 'CR11901', area_ha: 12, fuente_agua: 'rio', riego: false, suelo: 'franco', creado: '2026-10-12' },
    { id: 'f5', usuario_id: 'u-agri', nombre: 'Las Nubes', codigo_distrito: 'CR30702', area_ha: 6, fuente_agua: 'lluvia', riego: true, suelo: 'volcanico', creado: '2026-10-15' },
    { id: 'f6', usuario_id: 'u-agri', nombre: 'Valle Verde', codigo_distrito: 'CR70201', area_ha: 25, fuente_agua: 'pozo', riego: true, suelo: 'franco', creado: '2026-10-18' },
  ],
  siembras: [
    { id: 's1', finca_id: 'f1', cultivo_id: 'papa', area_ha: 1, fecha_siembra: '2026-09-01', cosecha_esperada: '2026-12-20', estado: 'activa', resultado: null, cantidad: null, unidad: null, motivo: null, fecha_cierre: null },
    { id: 's2', finca_id: 'f1', cultivo_id: 'zanahoria', area_ha: 0.5, fecha_siembra: '2026-10-05', cosecha_esperada: '2027-01-15', estado: 'activa', resultado: null, cantidad: null, unidad: null, motivo: null, fecha_cierre: null },
    { id: 's3', finca_id: 'f1', cultivo_id: 'frijol', area_ha: 1, fecha_siembra: '2026-04-20', cosecha_esperada: '2026-07-20', estado: 'finalizada', resultado: 'exitosa', cantidad: 22, unidad: 'quintales', motivo: null, fecha_cierre: '2026-07-25' },
    { id: 's4', finca_id: 'f2', cultivo_id: 'repollo', area_ha: 0.8, fecha_siembra: '2026-05-10', cosecha_esperada: '2026-08-10', estado: 'finalizada', resultado: 'perdida', cantidad: 0, unidad: 'sacos', motivo: 'Hernia de las crucíferas en casi toda la parcela.', fecha_cierre: '2026-08-02' },
    { id: 's5', finca_id: 'f2', cultivo_id: 'papa', area_ha: 1, fecha_siembra: '2026-01-15', cosecha_esperada: '2026-05-01', estado: 'finalizada', resultado: 'regular', cantidad: 180, unidad: 'sacos', motivo: 'Tizón tardío en abril.', fecha_cierre: '2026-05-05' },
  ],
  seguimiento: [
    { id: 'g1', siembra_id: 's1', fecha: '2026-09-20', tipo: 'abono', nota: 'Primera abonada con 10-30-10.' },
    { id: 'g2', siembra_id: 's1', fecha: '2026-10-15', tipo: 'riego', nota: 'Riego de 2 horas por poca lluvia.' },
    { id: 'g3', siembra_id: 's1', fecha: '2026-11-08', tipo: 'problema', nota: 'Manchas cafés en hojas de la parte baja.' },
  ],
  reportes: [
    { id: 'r1', usuario_id: 'u-agri', siembra_id: 's1', codigo_distrito: 'CR30101', tipo: 'hongo', plaga_id: 'tizon-tardio', sintomas: 'Manchas cafés en las hojas de abajo.', gravedad: 'moderada', con_foto: true, fecha: '2026-11-08', estado: 'pendiente' },
    { id: 'r2', usuario_id: 'u-agri2', siembra_id: null, codigo_distrito: 'CR21001', tipo: 'insecto', plaga_id: 'mosca-blanca', sintomas: 'Mosquitas blancas debajo de las hojas del chile.', gravedad: 'leve', con_foto: false, fecha: '2026-11-11', estado: 'confirmado' },
  ],
  vuelos: [
    vuelo('v1', 'f1', '2026-11-02', 12, cuadricula(6, 8, 0.78, [[1, 5], [4, 2]]), ESPERANZA),
    vuelo('v2', 'f1', '2026-10-05', 12, cuadricula(6, 8, 0.68, [[2, 6]]), ESPERANZA),
    // Río Claro: 12 ha en 14 × 20 parcelas, ladera con río abajo.
    vuelo('v3', 'f4', '2026-11-06', 18, campo(14, 20, 0.76, 3, [[5, 14, 2.5, 0.35], [11, 4, 2, 0.3], [3, 16, 1.5, 0.25]], RIO_CLARO), RIO_CLARO),
    vuelo('v4', 'f4', '2026-09-28', 18, campo(14, 20, 0.7, 3, [[5, 14, 3.5, 0.4], [11, 4, 2.5, 0.35], [8, 7, 2, 0.3]], RIO_CLARO), RIO_CLARO),
    // Las Nubes: 6 ha muy empinadas (38 %), con naciente y reservorio.
    vuelo('v5', 'f5', '2026-11-10', 38, campo(10, 14, 0.72, 5, [[2, 10, 1.8, 0.35], [7, 3, 1.5, 0.4]], LAS_NUBES), LAS_NUBES),
    // Valle Verde: 25 ha planas en 18 × 24 parcelas, con canales de riego y río al fondo.
    vuelo('v6', 'f6', '2026-11-12', 3, campo(18, 24, 0.8, 7, [[9, 18, 3, 0.4], [4, 8, 2, 0.3], [14, 4, 1.5, 0.3]], VALLE_VERDE), VALLE_VERDE),
    vuelo('v7', 'f6', '2026-10-12', 3, campo(18, 24, 0.77, 7, [[9, 18, 2, 0.3], [4, 8, 2.5, 0.35]], VALLE_VERDE), VALLE_VERDE),
    vuelo('v8', 'f6', '2026-09-12', 3, campo(18, 24, 0.74, 7, [[4, 8, 3, 0.4], [15, 10, 2, 0.3]], VALLE_VERDE), VALLE_VERDE),
  ],
};
