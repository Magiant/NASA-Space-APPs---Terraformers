// DATOS DE EJEMPLO de usuarios, para la demo mientras no estén las tablas de Supabase.
// Las contraseñas aquí son solo de demostración; con Supabase Auth nunca se guardan en la web.
import type { Finca, ReportePlaga, Seguimiento, Siembra, Usuario, VueloDron } from '../tipos';

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
    { id: 'v1', finca_id: 'f1', fecha: '2026-11-02', ndvi_promedio: 0.71, pendiente_pct: 12, area_estres_pct: 14, cuadricula: cuadricula(6, 8, 0.78, [[1, 5], [4, 2]]) },
    { id: 'v2', finca_id: 'f1', fecha: '2026-10-05', ndvi_promedio: 0.64, pendiente_pct: 12, area_estres_pct: 8, cuadricula: cuadricula(6, 8, 0.68, [[2, 6]]) },
  ],
};
