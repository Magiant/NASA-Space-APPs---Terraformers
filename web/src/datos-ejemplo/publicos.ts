// DATOS DE EJEMPLO — valores inventados con la forma de los índices de Algolia.
// Se reemplazan cuando los extractores publiquen los datos reales.
import type {
  Extraccion, Nivel, RegistroAlerta, RegistroAptitud, RegistroCapacitacion, RegistroCultivo,
  RegistroPlaga, RegistroPrecio, RegistroSiembraZona, RegistroZona,
} from '../tipos';

export const ACTUALIZADO = '2026-11-14';
export const FECHA_PRECIOS = '2026-11-13';

/** Número pseudoaleatorio estable a partir de un texto (mismo texto → mismo número). */
export function semilla(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

// ------------------------------------------------------------------
// Zonas
// ------------------------------------------------------------------
type BaseZona = [
  codigo: string, provincia: string, canton: string, distrito: string,
  lat: number, lng: number, altitud: number, temp: number, lluvia: number,
  textura: string, ph: number, riesgos: [string, RegistroZona['riesgos'][number]['nivel']][], protegida: number,
];

const BASE_ZONAS: BaseZona[] = [
  ['CR30101', 'Cartago', 'Cartago', 'Oriental', 9.864, -83.919, 1435, 19.5, 140, 'Franco (volcánico)', 6.1, [['Deslizamiento', 'medio'], ['Volcán', 'bajo']], 0],
  ['CR30108', 'Cartago', 'Cartago', 'Tierra Blanca', 9.912, -83.889, 2100, 15.2, 165, 'Franco (volcánico)', 5.8, [['Volcán', 'medio'], ['Deslizamiento', 'medio']], 5],
  ['CR30702', 'Cartago', 'Oreamuno', 'Cot', 9.893, -83.868, 1950, 16.1, 170, 'Franco limoso (volcánico)', 5.6, [['Volcán', 'alto'], ['Deslizamiento', 'alto']], 12],
  ['CR20101', 'Alajuela', 'Alajuela', 'Alajuela', 10.016, -84.214, 950, 23.1, 190, 'Franco arcilloso', 6.4, [['Inundación', 'bajo'], ['Sismo', 'medio']], 0],
  ['CR21001', 'Alajuela', 'San Carlos', 'Quesada', 10.323, -84.428, 650, 24.8, 320, 'Arcilloso', 5.4, [['Inundación', 'medio'], ['Deslizamiento', 'medio']], 8],
  ['CR11901', 'San José', 'Pérez Zeledón', 'San Isidro de El General', 9.373, -83.703, 700, 24.0, 250, 'Franco arcilloso', 5.9, [['Deslizamiento', 'medio'], ['Inundación', 'medio']], 3],
  ['CR50101', 'Guanacaste', 'Liberia', 'Liberia', 10.635, -85.438, 140, 28.3, 60, 'Franco arenoso', 6.8, [['Sequía', 'alto'], ['Incendio forestal', 'medio']], 15],
  ['CR70201', 'Limón', 'Pococí', 'Guápiles', 10.215, -83.785, 260, 25.9, 380, 'Franco (aluvial)', 5.5, [['Inundación', 'alto'], ['Huracán', 'bajo']], 20],
];

export const ZONAS: RegistroZona[] = BASE_ZONAS.map(
  ([codigo, provincia, canton, distrito, lat, lng, altitud, temp, lluvia, textura, ph, riesgos, protegida]) => {
    const s = semilla(codigo);
    const humedad = Math.round(25 + (lluvia / 400) * 45 + s * 10);
    const balance = Math.round(lluvia - 110 - s * 30);
    return {
      objectID: `zona-${codigo}`,
      codigo_distrito: codigo,
      distrito, canton, provincia,
      ubicacion: { lvl0: provincia, lvl1: `${provincia} > ${canton}`, lvl2: `${provincia} > ${canton} > ${distrito}` },
      _geoloc: { lat, lng },
      altitud_m: altitud,
      clima: {
        temp_media_c: temp,
        temp_max_c: Math.round((temp + 5 + s * 2) * 10) / 10,
        temp_min_c: Math.round((temp - 6 - s * 2) * 10) / 10,
        lluvia_mes_mm: lluvia,
        humedad_relativa_pct: Math.min(95, Math.round(65 + lluvia / 20)),
      },
      humedad_suelo: { pct: humedad, estado: humedad < 35 ? 'seco' : humedad > 65 ? 'humedo' : 'normal' },
      agua: { balance_mm: balance, estado: balance < -20 ? 'falta' : balance > 80 ? 'sobra' : 'equilibrio' },
      suelo: { textura, ph, materia_organica: textura.includes('volcánico') ? 'alta' : s > 0.5 ? 'media' : 'baja' },
      riesgos: riesgos.map(([tipo, nivel]) => ({ tipo, nivel })),
      area_protegida_pct: protegida,
      actualizado: ACTUALIZADO,
    };
  },
);

// ------------------------------------------------------------------
// Plagas
// ------------------------------------------------------------------
export const PLAGAS: RegistroPlaga[] = [
  {
    objectID: 'plaga-tizon-tardio', id: 'tizon-tardio', nombre: 'Tizón tardío', tipo: 'hongo',
    cultivos: ['papa', 'tomate'],
    sintomas: 'Manchas cafés y húmedas en las hojas, con polvillo blanco por debajo. Avanza rápido con lluvia y frío.',
    control: {
      cultural: ['Sembrar semilla sana y variedades tolerantes.', 'Dejar buena distancia entre plantas para que circule el aire.', 'Arrancar y sacar de la finca las plantas enfermas.'],
      biologico: ['Aplicar Trichoderma o Bacillus subtilis de forma preventiva.'],
      quimico: ['Solo si el ataque es fuerte: fungicida registrado en el SFE, con asesoría de un técnico.'],
    },
    cultivos_que_cortan: ['frijol', 'maiz', 'repollo', 'zanahoria'],
  },
  {
    objectID: 'plaga-mosca-blanca', id: 'mosca-blanca', nombre: 'Mosca blanca', tipo: 'insecto',
    cultivos: ['tomate', 'chile', 'frijol'],
    sintomas: 'Mosquitas blancas debajo de las hojas; hojas amarillas, pegajosas o enrolladas.',
    control: {
      cultural: ['Poner trampas amarillas con pegamento.', 'Eliminar malezas alrededor del cultivo.', 'Usar barreras de maíz alrededor de la parcela.'],
      biologico: ['Hongos Beauveria bassiana o Isaria; liberar crisopas.'],
      quimico: ['Insecticida registrado en el SFE, rotando el tipo de producto.'],
    },
    cultivos_que_cortan: ['maiz', 'cebolla', 'yuca', 'culantro'],
  },
  {
    objectID: 'plaga-gusano-cogollero', id: 'gusano-cogollero', nombre: 'Gusano cogollero', tipo: 'insecto',
    cultivos: ['maiz', 'arroz'],
    sintomas: 'Hojas comidas en el cogollo, con aserrín húmedo; plantas jóvenes cortadas.',
    control: {
      cultural: ['Sembrar a tiempo y revisar el cogollo cada semana.', 'Asociar maíz con frijol.'],
      biologico: ['Aplicar Bacillus thuringiensis; cuidar a las avispas que lo controlan.'],
      quimico: ['Insecticida registrado en el SFE dirigido al cogollo, solo si pasa el umbral.'],
    },
    cultivos_que_cortan: ['frijol', 'yuca', 'papa', 'repollo'],
  },
  {
    objectID: 'plaga-broca', id: 'broca', nombre: 'Broca del café', tipo: 'insecto',
    cultivos: ['cafe'],
    sintomas: 'Granos de café con un hueco pequeño en la corona; granos que se caen o pierden peso.',
    control: {
      cultural: ['Recoger todos los granos que quedan en la mata y en el suelo (repela).'],
      biologico: ['Aplicar el hongo Beauveria bassiana; usar trampas con alcohol.'],
      quimico: ['Solo con asesoría técnica y productos registrados en el SFE.'],
    },
    cultivos_que_cortan: [],
  },
  {
    objectID: 'plaga-nematodo', id: 'nematodo', nombre: 'Nematodo agallador', tipo: 'nematodo',
    cultivos: ['tomate', 'zanahoria', 'papa', 'chile'],
    sintomas: 'Raíces con bolitas o nudos; plantas pequeñas y marchitas en las horas de calor.',
    control: {
      cultural: ['Rotar con cultivos que no lo alimentan.', 'Agregar abono orgánico bien compostado.'],
      biologico: ['Sembrar mostaza o crotalaria e incorporarla al suelo (biofumigación).'],
      quimico: ['Nematicida registrado en el SFE solo como último recurso.'],
    },
    cultivos_que_cortan: ['maiz', 'cebolla', 'arroz', 'repollo'],
  },
  {
    objectID: 'plaga-hernia', id: 'hernia', nombre: 'Hernia de las crucíferas', tipo: 'hongo',
    cultivos: ['repollo'],
    sintomas: 'Raíces hinchadas y deformes; plantas que se marchitan aunque haya agua.',
    control: {
      cultural: ['Encalar para subir el pH del suelo.', 'No sembrar repollo ni coliflor en ese terreno por varios años.'],
      biologico: ['Abono orgánico con Trichoderma.'],
      quimico: ['No hay control químico eficaz; la rotación es la mejor herramienta.'],
    },
    cultivos_que_cortan: ['papa', 'zanahoria', 'frijol', 'maiz', 'cebolla'],
  },
  {
    objectID: 'plaga-trips', id: 'trips', nombre: 'Trips de la cebolla', tipo: 'insecto',
    cultivos: ['cebolla', 'chile'],
    sintomas: 'Hojas con rayas plateadas o blancas; puntas secas.',
    control: {
      cultural: ['Riego por aspersión en épocas secas.', 'Trampas azules con pegamento.'],
      biologico: ['Hongos Beauveria o Metarhizium.'],
      quimico: ['Insecticida registrado en el SFE, rotando el tipo de producto.'],
    },
    cultivos_que_cortan: ['zanahoria', 'papa', 'maiz'],
  },
  {
    objectID: 'plaga-polilla-papa', id: 'polilla-papa', nombre: 'Polilla de la papa', tipo: 'insecto',
    cultivos: ['papa'],
    sintomas: 'Galerías dentro del tubérculo; larvas pequeñas en la papa almacenada.',
    control: {
      cultural: ['Aporcar bien para tapar los tubérculos.', 'Cosechar a tiempo y no dejar papas en el campo.'],
      biologico: ['Trampas con feromona; Bacillus thuringiensis en bodega.'],
      quimico: ['Solo con productos registrados en el SFE y asesoría técnica.'],
    },
    cultivos_que_cortan: ['maiz', 'frijol', 'zanahoria', 'repollo'],
  },
];

// ------------------------------------------------------------------
// Cultivos
// ------------------------------------------------------------------
type BaseCultivo = [
  id: string, nombre: string, cientifico: string, familia: string, icono: string,
  ciclo: [number, number], temp: [number, number], lluvia: [number, number], ph: [number, number],
  altitud: [number, number], meses: number[], efecto: string, mercado: number,
];

const BASE_CULTIVOS: BaseCultivo[] = [
  ['papa', 'Papa', 'Solanum tuberosum', 'Solanáceas', '🥔', [100, 130], [12, 20], [500, 800], [5.0, 6.5], [1400, 3000], [4, 5, 9], 'Gasta mucho potasio del suelo.', 85],
  ['cebolla', 'Cebolla', 'Allium cepa', 'Amarilidáceas', '🧅', [110, 150], [13, 24], [350, 550], [6.0, 7.0], [900, 2500], [11, 12, 1], 'Gasta poco; deja el suelo limpio de nematodos.', 78],
  ['zanahoria', 'Zanahoria', 'Daucus carota', 'Apiáceas', '🥕', [90, 120], [15, 22], [400, 650], [5.5, 7.0], [1200, 2800], [3, 4, 8, 9], 'Pide suelo suelto; afloja la tierra.', 70],
  ['repollo', 'Repollo', 'Brassica oleracea', 'Brasicáceas', '🥬', [80, 110], [14, 22], [380, 600], [6.0, 7.5], [1200, 2800], [5, 6, 10], 'Gasta mucho nitrógeno.', 62],
  ['frijol', 'Frijol', 'Phaseolus vulgaris', 'Fabáceas', '🫘', [75, 95], [17, 27], [300, 500], [5.5, 7.0], [100, 1600], [5, 9, 11], 'Deja nitrógeno en el suelo: bueno para rotar.', 74],
  ['maiz', 'Maíz', 'Zea mays', 'Poáceas', '🌽', [100, 140], [18, 30], [500, 800], [5.5, 7.5], [0, 2200], [5, 6, 8], 'Gasta nitrógeno; deja mucha paja para el suelo.', 66],
  ['tomate', 'Tomate', 'Solanum lycopersicum', 'Solanáceas', '🍅', [90, 120], [18, 27], [400, 600], [5.5, 7.0], [400, 1800], [1, 2, 10, 11], 'Gasta mucho potasio y calcio.', 88],
  ['chile', 'Chile dulce', 'Capsicum annuum', 'Solanáceas', '🫑', [100, 140], [18, 28], [500, 700], [5.5, 7.0], [300, 1600], [1, 2, 9], 'Gasta potasio.', 80],
  ['cafe', 'Café', 'Coffea arabica', 'Rubiáceas', '☕', [1095, 1460], [17, 23], [1500, 2500], [5.0, 6.5], [800, 1700], [5, 6], 'Cultivo permanente; protege el suelo.', 72],
  ['arroz', 'Arroz', 'Oryza sativa', 'Poáceas', '🌾', [110, 140], [22, 32], [1000, 1800], [5.0, 6.5], [0, 500], [5, 6], 'Necesita mucha agua.', 64],
  ['pina', 'Piña', 'Ananas comosus', 'Bromeliáceas', '🍍', [450, 540], [22, 32], [1000, 1500], [4.5, 5.5], [0, 700], [3, 4, 9], 'Ocupa el terreno más de un año.', 76],
  ['yuca', 'Yuca', 'Manihot esculenta', 'Euforbiáceas', '🥔', [240, 330], [22, 32], [800, 1500], [5.0, 6.5], [0, 1000], [4, 5, 10], 'Aguanta suelos pobres y sequía.', 68],
  ['culantro', 'Culantro', 'Coriandrum sativum', 'Apiáceas', '🌿', [40, 60], [15, 25], [300, 500], [6.0, 7.5], [600, 2400], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Ciclo corto, gasta poco.', 60],
];

export const CULTIVOS: RegistroCultivo[] = BASE_CULTIVOS.map(
  ([id, nombre, cientifico, familia, icono, ciclo, temp, lluvia, ph, altitud, meses, efecto]) => ({
    objectID: `cultivo-${id}`,
    id, nombre, nombre_cientifico: cientifico, familia, icono,
    ciclo_dias_min: ciclo[0], ciclo_dias_max: ciclo[1],
    temp_opt_min_c: temp[0], temp_opt_max_c: temp[1],
    lluvia_opt_min_mm: lluvia[0], lluvia_opt_max_mm: lluvia[1],
    ph_opt_min: ph[0], ph_opt_max: ph[1],
    altitud_min_m: altitud[0], altitud_max_m: altitud[1],
    meses_siembra: meses,
    plagas: PLAGAS.filter((p) => p.cultivos.includes(id)).map((p) => p.id),
    efecto_suelo: efecto,
    actualizado: ACTUALIZADO,
  }),
);

const MERCADO: Record<string, number> = Object.fromEntries(BASE_CULTIVOS.map((c) => [c[0], c[12]]));

// ------------------------------------------------------------------
// Precios (PIMA diario, CNP semanal)
// ------------------------------------------------------------------
type BasePrecio = [id: string | null, producto: string, fuente: 'PIMA' | 'CNP', unidad: string, precio: number];

const BASE_PRECIOS: BasePrecio[] = [
  ['papa', 'Papa blanca', 'PIMA', 'saco 45 kg', 25000],
  ['cebolla', 'Cebolla amarilla', 'PIMA', 'saco 45 kg', 28000],
  ['zanahoria', 'Zanahoria', 'PIMA', 'caja 20 kg', 9500],
  ['repollo', 'Repollo verde', 'PIMA', 'saco 20 unidades', 6000],
  ['tomate', 'Tomate', 'PIMA', 'caja 18 kg', 14500],
  ['chile', 'Chile dulce', 'PIMA', 'caja 100 unidades', 11000],
  ['culantro', 'Culantro castilla', 'PIMA', 'rollo 12 manojos', 3000],
  ['yuca', 'Yuca', 'PIMA', 'saco 40 kg', 12000],
  ['pina', 'Piña', 'PIMA', 'docena', 9000],
  ['frijol', 'Frijol rojo', 'CNP', 'quintal 46 kg', 52000],
  ['maiz', 'Maíz blanco', 'CNP', 'quintal 46 kg', 17500],
  ['arroz', 'Arroz en granza', 'CNP', 'saco 73,6 kg', 21500],
  ['cafe', 'Café (fanega)', 'CNP', 'fanega', 98000],
];

export const PRECIOS: RegistroPrecio[] = BASE_PRECIOS.map(([id, producto, fuente, unidad, precio]) => {
  const s = semilla(producto);
  const cambio = s < 0.35 ? -(0.04 + s * 0.2) : s > 0.65 ? 0.04 + (s - 0.65) * 0.3 : 0;
  const anterior = Math.round(precio / (1 + cambio) / 50) * 50;
  return {
    objectID: `precio-${fuente.toLowerCase()}-${id ?? producto}`,
    producto, cultivo_id: id, fuente,
    mercado: fuente === 'PIMA' ? 'CENADA' : 'Precios de referencia CNP',
    unidad, precio, precio_anterior: anterior,
    tendencia: cambio > 0.02 ? 'sube' : cambio < -0.02 ? 'baja' : 'estable',
    fecha: fuente === 'PIMA' ? FECHA_PRECIOS : '2026-11-10',
  };
});

// ------------------------------------------------------------------
// Alertas
// ------------------------------------------------------------------
export const ALERTAS: RegistroAlerta[] = [
  {
    objectID: 'alerta-imn-1', fuente: 'IMN', tipo: 'Lluvias fuertes', nivel: 'amarilla',
    titulo: 'Lluvias fuertes en el Caribe y la Zona Norte',
    descripcion: 'Se esperan aguaceros fuertes en la tarde y noche. Revise los desagües de la finca y evite sembrar en partes bajas esta semana.',
    codigos_distrito: ['CR70201', 'CR21001'], inicio: '2026-11-13T06:00:00-06:00', fin: '2026-11-16T18:00:00-06:00',
  },
  {
    objectID: 'alerta-cne-1', fuente: 'CNE', tipo: 'Volcán', nivel: 'verde',
    titulo: 'Volcán Irazú: actividad normal, en vigilancia',
    descripcion: 'Sin peligro para los cultivos por ahora. Si cae ceniza, lave las hojas de hortalizas con agua limpia.',
    codigos_distrito: ['CR30108', 'CR30702'], inicio: '2026-11-01T00:00:00-06:00', fin: null,
  },
  {
    objectID: 'alerta-imn-2', fuente: 'IMN', tipo: 'Sequía', nivel: 'naranja',
    titulo: 'Déficit de lluvia en Guanacaste',
    descripcion: 'Lluvia por debajo de lo normal. Prefiera cultivos que aguanten sequía y riegue temprano en la mañana.',
    codigos_distrito: ['CR50101'], inicio: '2026-11-05T00:00:00-06:00', fin: null,
  },
];

// ------------------------------------------------------------------
// Capacitaciones (INA)
// ------------------------------------------------------------------
export const CAPACITACIONES: RegistroCapacitacion[] = [
  { objectID: 'cap-1', titulo: 'Manejo integrado de plagas en hortalizas', institucion: 'INA', tema: 'Plagas', cultivo_id: null, plaga_id: 'mosca-blanca', modalidad: 'presencial', duracion_horas: 40, provincias: ['Cartago', 'Alajuela'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-2', titulo: 'Producción de papa con buenas prácticas agrícolas', institucion: 'INA', tema: 'Producción', cultivo_id: 'papa', plaga_id: 'tizon-tardio', modalidad: 'mixta', duracion_horas: 60, provincias: ['Cartago'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-3', titulo: 'Riego por goteo para pequeños productores', institucion: 'INA', tema: 'Agua', cultivo_id: null, plaga_id: null, modalidad: 'presencial', duracion_horas: 32, provincias: ['Guanacaste', 'Alajuela', 'San José'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-4', titulo: 'Abonos orgánicos y salud del suelo', institucion: 'INA', tema: 'Suelo', cultivo_id: null, plaga_id: 'nematodo', modalidad: 'virtual', duracion_horas: 24, provincias: ['Todas'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-5', titulo: 'Cultivo de tomate en invernadero', institucion: 'INA', tema: 'Producción', cultivo_id: 'tomate', plaga_id: null, modalidad: 'presencial', duracion_horas: 48, provincias: ['Alajuela', 'Cartago'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-6', titulo: 'Manejo de la broca del café', institucion: 'INA', tema: 'Plagas', cultivo_id: 'cafe', plaga_id: 'broca', modalidad: 'mixta', duracion_horas: 20, provincias: ['San José', 'Alajuela'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-7', titulo: 'Granos básicos: frijol y maíz', institucion: 'INA', tema: 'Producción', cultivo_id: 'frijol', plaga_id: 'gusano-cogollero', modalidad: 'presencial', duracion_horas: 40, provincias: ['Guanacaste', 'San José', 'Alajuela'], url: 'https://www.ina.ac.cr' },
  { objectID: 'cap-8', titulo: 'Costos y venta de la cosecha', institucion: 'INA', tema: 'Mercado', cultivo_id: null, plaga_id: null, modalidad: 'virtual', duracion_horas: 16, provincias: ['Todas'], url: 'https://www.ina.ac.cr' },
];

// ------------------------------------------------------------------
// Aptitud distrito × cultivo (calculada aquí solo para el ejemplo)
// ------------------------------------------------------------------
const limitar = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function nivelDe(puntaje: number): Nivel {
  return puntaje >= 80 ? 'excelente' : puntaje >= 60 ? 'bueno' : 'no_recomendado';
}

const NIVEL_RIESGO = { bajo: 10, medio: 25, alto: 45, muy_alto: 65 } as const;

/**
 * Aptitud de cada cultivo en un distrito. ESTIMACIÓN DE PRUEBA: compara el clima y el suelo del
 * distrito (reales cuando la web está conectada a Supabase) con los requisitos de ejemplo de cada
 * cultivo. La reemplaza la tabla `aptitud` cuando exista aptitud/calcular.ts.
 * Dato que falta → nota neutra (no se inventa a favor ni en contra).
 */
export function aptitudDeZonaEstimada(z: RegistroZona): RegistroAptitud[] {
  return CULTIVOS.map((c): RegistroAptitud => {
    const clave = `${z.codigo_distrito}-${c.id}`;
    const s = semilla(clave);
    // Clima: temperatura media del distrito frente al rango óptimo del cultivo; sin temperatura, la altura.
    const t = z.clima.temp_media_c;
    const fueraT = t === null ? null : t < c.temp_opt_min_c ? c.temp_opt_min_c - t : t > c.temp_opt_max_c ? t - c.temp_opt_max_c : 0;
    const alt = z.altitud_m;
    const fueraAlt = alt === null ? null : alt < c.altitud_min_m ? c.altitud_min_m - alt : alt > c.altitud_max_m ? alt - c.altitud_max_m : 0;
    const clima = fueraT !== null ? limitar(95 - fueraT * 9 - s * 6) : fueraAlt !== null ? limitar(95 - fueraAlt / 12 - s * 8) : 70;
    const phCentro = (c.ph_opt_min + c.ph_opt_max) / 2;
    const suelo = z.suelo.ph === null ? 70 : limitar(92 - Math.abs(z.suelo.ph - phCentro) * 18 - s * 10);
    const lluviaAnual = z.clima.lluvia_mes_mm === null ? null : z.clima.lluvia_mes_mm * 12;
    const aguaFuera = lluviaAnual === null ? 0 : lluviaAnual < c.lluvia_opt_min_mm ? c.lluvia_opt_min_mm - lluviaAnual : lluviaAnual > c.lluvia_opt_max_mm * 2.2 ? lluviaAnual - c.lluvia_opt_max_mm * 2.2 : 0;
    const agua = lluviaAnual === null ? 70 : limitar(90 - aguaFuera / 25 - s * 10);
    const mercado = limitar(MERCADO[c.id] + (s - 0.5) * 10);
    const riesgo = limitar((z.riesgos.length ? Math.max(...z.riesgos.map((r) => NIVEL_RIESGO[r.nivel])) : 15) + s * 10);
    const puntaje = limitar(clima * 0.3 + suelo * 0.2 + agua * 0.2 + mercado * 0.3 - riesgo * 0.15 + 8);

    let nivel: Nivel = nivelDe(puntaje);
    let motivo: string | null = null;
    const frio = fueraT !== null ? t! < c.temp_opt_min_c : alt !== null && alt > c.altitud_max_m;
    if ((fueraT !== null && fueraT > 6) || (fueraT === null && fueraAlt !== null && fueraAlt > 700)) {
      nivel = 'descartado';
      motivo = frio ? 'Hace demasiado frío para este cultivo.' : 'Hace demasiado calor para este cultivo.';
    } else if (c.id === 'pina' && (z.area_protegida_pct ?? 0) >= 15) {
      nivel = 'descartado';
      motivo = 'Parte de la zona es área protegida.';
    }

    const precio = PRECIOS.find((p) => p.cultivo_id === c.id);
    return {
      objectID: `aptitud-${clave}`,
      cultivo: c.nombre, cultivo_id: c.id, familia: c.familia,
      ubicacion: z.ubicacion, codigo_distrito: z.codigo_distrito, _geoloc: z._geoloc,
      puntaje: nivel === 'descartado' ? Math.min(puntaje, 30) : puntaje,
      nivel,
      notas: { clima, suelo, agua, mercado, riesgo },
      mes_siembra: c.meses_siembra[0] ?? null,
      plagas_zona: PLAGAS.filter((p) => p.cultivos.includes(c.id) && s > 0.3).map((p) => p.nombre).slice(0, 2),
      precio_referencia: precio ? { valor: precio.precio, unidad: precio.unidad, fecha: precio.fecha, fuente: precio.fuente } : null,
      motivo_descarte: motivo,
      actualizado: z.actualizado,
    };
  });
}

export const APTITUD: RegistroAptitud[] = ZONAS.flatMap(aptitudDeZonaEstimada);

// ------------------------------------------------------------------
// Siembras por zona (totales anónimos)
// ------------------------------------------------------------------
export const SIEMBRAS_ZONA: RegistroSiembraZona[] = ZONAS.flatMap((z) =>
  APTITUD.filter((a) => a.codigo_distrito === z.codigo_distrito && a.nivel !== 'descartado')
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 4)
    .map((a) => {
      const s = semilla(a.objectID + 'sz');
      return {
        codigo_distrito: z.codigo_distrito, cultivo_id: a.cultivo_id, cultivo: a.cultivo,
        hectareas: Math.round(5 + s * 60), fincas: Math.round(2 + s * 25), mes_cosecha: 1 + Math.floor(s * 12),
      };
    }),
);

// ------------------------------------------------------------------
// Rotación: qué sembrar después (estudio del equipo, de ejemplo)
// ------------------------------------------------------------------
export const SIGUIENTES: Record<string, { recomendados: string[]; evitar: string[]; porque: string }> = {
  Solanáceas: { recomendados: ['frijol', 'maiz', 'repollo'], evitar: ['papa', 'tomate', 'chile'], porque: 'El frijol devuelve nitrógeno y no comparte plagas con la papa ni el tomate.' },
  Fabáceas: { recomendados: ['maiz', 'papa', 'repollo'], evitar: ['frijol'], porque: 'El frijol dejó nitrógeno: aprovéchelo con un cultivo que lo necesite, como el maíz.' },
  Poáceas: { recomendados: ['frijol', 'papa', 'cebolla'], evitar: ['maiz', 'arroz'], porque: 'Cambiar de familia corta el ciclo del gusano cogollero.' },
  Brasicáceas: { recomendados: ['papa', 'frijol', 'zanahoria'], evitar: ['repollo'], porque: 'Evite repetir repollo para no aumentar la hernia de las crucíferas.' },
  Amarilidáceas: { recomendados: ['zanahoria', 'papa', 'tomate'], evitar: ['cebolla'], porque: 'La cebolla deja el suelo limpio de nematodos para cultivos de raíz.' },
  Apiáceas: { recomendados: ['cebolla', 'frijol', 'repollo'], evitar: ['zanahoria', 'culantro'], porque: 'Cambiar de familia reduce las enfermedades de la raíz.' },
  Rubiáceas: { recomendados: ['frijol'], evitar: [], porque: 'El café es permanente; el frijol se puede sembrar entre calles al renovar.' },
  Bromeliáceas: { recomendados: ['frijol', 'yuca'], evitar: ['pina'], porque: 'Después de la piña conviene devolver nitrógeno y materia orgánica.' },
  Euforbiáceas: { recomendados: ['frijol', 'maiz'], evitar: ['yuca'], porque: 'La yuca gasta el suelo; el frijol lo recupera.' },
};

// ------------------------------------------------------------------
// Extracciones (para el panel de administración)
// ------------------------------------------------------------------
export const EXTRACCIONES: Extraccion[] = [
  { id: 'e1', extractor: 'precios/pima', inicio: '2026-11-14T05:00:12-06:00', duracion_s: 41, estado: 'ok', registros: 312, mensaje: null },
  { id: 'e2', extractor: 'precios/cnp', inicio: '2026-11-14T05:01:05-06:00', duracion_s: 18, estado: 'ok', registros: 46, mensaje: null },
  { id: 'e3', extractor: 'clima/open-meteo', inicio: '2026-11-14T05:02:00-06:00', duracion_s: 223, estado: 'ok', registros: 492, mensaje: null },
  { id: 'e4', extractor: 'clima/nasa-power', inicio: '2026-11-14T05:06:01-06:00', duracion_s: 310, estado: 'parcial', registros: 455, mensaje: '37 distritos sin respuesta; se reintentará mañana.' },
  { id: 'e5', extractor: 'riesgos/cne', inicio: '2026-11-14T05:11:40-06:00', duracion_s: 12, estado: 'error', registros: 0, mensaje: 'La página de la CNE no respondió (tiempo agotado).' },
  { id: 'e6', extractor: 'aptitud/calcular', inicio: '2026-11-14T05:12:30-06:00', duracion_s: 64, estado: 'ok', registros: 6396, mensaje: null },
  { id: 'e7', extractor: 'suelos/soilgrids', inicio: '2026-11-09T04:00:00-06:00', duracion_s: 1220, estado: 'ok', registros: 492, mensaje: null },
];
