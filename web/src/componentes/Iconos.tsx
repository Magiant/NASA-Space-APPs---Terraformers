// Íconos dibujados en SVG: se ven igual en todos los celulares y computadoras
// (los emojis de bandera, por ejemplo, en Windows salen como letras).

/** Grano de café (no existe como emoji). */
function GranoCafe() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden className="icono-svg">
      <ellipse cx="16" cy="16" rx="10.5" ry="13" transform="rotate(30 16 16)" fill="#6b3e1f" />
      <ellipse cx="16" cy="16" rx="10.5" ry="13" transform="rotate(30 16 16)" fill="none" stroke="#4a2810" strokeWidth="1.2" />
      <path d="M22.2 6.4c-4.6 2.6-3.2 7.4-6.2 9.6s-6.8 3.2-6.2 9.6" fill="none" stroke="#2e170a" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="11.5" cy="11" rx="2.2" ry="3.6" transform="rotate(30 11.5 11)" fill="#a8693c" opacity=".55" />
    </svg>
  );
}

/** Íconos de navegación y accesos: mismo trazo en todo el producto (reemplazan emojis). */
const TRAZOS: Record<string, string> = {
  sembrar: 'M12 21v-8M12 13c0-4 2.5-6.5 7-6.5 0 4-2.5 6.5-7 6.5ZM12 15c0-3-2-5-6-5 0 3 2 5 6 5Z',
  precios: 'M4 19V9M10 19V5M16 19v-7M22 19H2M20 5l-4 4-3-2',
  alertas: 'M12 3 2.5 20h19L12 3ZM12 10v4.5M12 17.2v.1',
  cursos: 'M2 9l10-5 10 5-10 5L2 9ZM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6',
  finca: 'M3 11l9-7 9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5',
  plaga: 'M12 8a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0v-3a4 4 0 0 1 4-4ZM9 6l1.5 2M15 6l-1.5 2M4 12h4M16 12h4M5 18l3-2M19 18l-3-2',
  dron: 'M12 10v4M5 8h4M15 8h4M7 8v-2M17 8v-2M8.5 14h7l1.5 3H7l1.5-3Z',
  brujula: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
  globo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12.5l3 3 5-6',
  sinsenal: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 3.5-2M19 12.5a10 10 0 0 0-6-2.9M12 20v.1',
  pin: 'M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  calendario: 'M4 6h16v14H4ZM4 10h16M8 3v4M16 3v4',
  moneda: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v1.5M12 16.5V18',
  usuarios: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.4c2 .7 3.5 2.5 3.5 5.6',
  hoja: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14ZM5 19c2-4 5-7 9-9',
  montana: 'M2 19l7-12 4 7 3-4 6 9Z',
  libro: 'M6 3h12v18H6ZM6 7H4M6 12H4M6 17H4M10 8h5',
  mas: 'M12 5v14M5 12h14',
  flecha: 'M9 6l6 6-6 6',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  senal: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20v.1',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  luna: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  feliz: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 14c1 1.5 2.1 2 3.5 2s2.5-.5 3.5-2M9 9.5v.1M15 9.5v.1',
  normal: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 15h7M9 9.5v.1M15 9.5v.1',
  triste: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 16c1-1.5 2.1-2 3.5-2s2.5.5 3.5 2M9 9.5v.1M15 9.5v.1',
  hongo: 'M3 12a9 8 0 0 1 18 0ZM9 12v6a3 3 0 0 0 6 0v-6',
  adn: 'M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9M8.5 6.5h7M8.5 17.5h7',
  gusano: 'M3 14c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5M19 9h.1',
  maleza: 'M12 21V8M12 8c-2.5-.5-3.5-2.5-3.5-5 2.5.5 3.5 2.5 3.5 5ZM12 8c2.5-.5 3.5-2.5 3.5-5-2.5.5-3.5 2.5-3.5 5ZM12 14c-2.5-.5-3.5-2.5-3.5-5M12 14c2.5-.5 3.5-2.5 3.5-5',
  pregunta: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.1',
  camara: 'M3 8h4l2-3h6l2 3h4v12H3ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  termometro: 'M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0ZM12 9v8',
  lluvia: 'M7 15a4.5 4.5 0 0 1 .8-8.9A6 6 0 0 1 19 8a3.5 3.5 0 0 1-1 7ZM8 18v3M12 18v3M16 18v3',
  gota: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  grifo: 'M4 7h12a3 3 0 0 1 3 3v2h-5M4 7V4M8 7V4M17 15c0 1.2 1 2 1 3a1 1 0 1 1-2 0c0-1 1-1.8 1-3Z',
  tierra: 'M3 8l9-4 9 4-9 4ZM3 12l9 4 9-4M3 16l9 4 9-4',
  reciclar: 'M4 12a8 8 0 0 1 13.5-5.8L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.5 5.8L4 15.5M4 20v-4.5h4.5',
  volcan: 'M2 20l7-10h6l7 10ZM10 10l-1-3M14 10l1-3M12 9V5',
  mapa: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2ZM9 4v14M15 6v14',
  candado: 'M5 11h14v10H5ZM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
  arbol: 'M12 21v-6M12 3c4 0 7 3 6 6 2 1 2 5-1 6H7c-3-1-3-5-1-6-1-3 2-6 6-6Z',
  escuela: 'M3 10l9-6 9 6M5 10v9h14v-9M9 19v-5h6v5',
  laptop: 'M5 6h14v9H5ZM2 19h20',
  mezcla: 'M3 6h4l10 12h4M3 18h4l3-3.5M14 9.5L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
  canasta: 'M4 10h16l-1.5 9h-13ZM8 10l3-6M16 10l-3-6',
  probeta: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8',
  nota: 'M5 3h14v18H5ZM9 8h6M9 12h6M9 16h3',
  arena: 'M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9',
  lupa: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5L21 21',
  marca: 'M5 12.5l4.5 4.5L19 7',
  cruz: 'M6 6l12 12M18 6L6 18',
  medio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 3v18',
};

export type NombreIcono = keyof typeof TRAZOS;
export function Icono({ nombre, tam = 24 }: { nombre: NombreIcono; tam?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="icono-svg">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}


const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden className="icono-svg">{children}</svg>
);
const CULTIVOS: Record<string, () => JSX.Element> = {
  cafe: GranoCafe,
  papa: () => <Svg><ellipse cx="16" cy="17" rx="12" ry="9" fill="#c99a52" /><ellipse cx="12" cy="14" rx="3" ry="1.6" fill="#a87a3a" opacity=".6" /><circle cx="19" cy="20" r="1.1" fill="#8a5f27" /><circle cx="22" cy="15" r="1.1" fill="#8a5f27" /><circle cx="10" cy="20" r="1.1" fill="#8a5f27" /></Svg>,
  cebolla: () => <Svg><path d="M16 5c1 3 1 5 0 7" fill="none" stroke="#5a8f3a" strokeWidth="2.2" strokeLinecap="round" /><path d="M16 11c-7 0-11 5-11 10 0 4 4 7 11 7s11-3 11-7c0-5-4-10-11-10Z" fill="#a24a8c" /><path d="M16 11c-3 3-4 8-4 17M16 11c3 3 4 8 4 17" fill="none" stroke="#d9a1cf" strokeWidth="1.2" /></Svg>,
  zanahoria: () => <Svg><path d="M13 4l3 4 3-4M16 8V3" fill="none" stroke="#4f9a3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 11h14l-6 18a1 1 0 0 1-2 0Z" fill="#ec7a1c" /><path d="M12 15h4M13 20h3.5M14.3 25h2" stroke="#b9560a" strokeWidth="1.3" strokeLinecap="round" /></Svg>,
  repollo: () => <Svg><circle cx="16" cy="17" r="12" fill="#8cc152" /><path d="M16 5c-5 5-5 17 0 24M16 5c5 5 5 17 0 24M5 15c6 3 16 3 22 0" fill="none" stroke="#5f9a31" strokeWidth="1.4" /></Svg>,
  frijol: () => <Svg><path d="M25 7c-6-2-17 2-18 12-1 6 5 8 10 5 6-3 11-12 8-17Z" fill="#9b3d2e" /><ellipse cx="14" cy="17" rx="2.2" ry="1.2" transform="rotate(-35 14 17)" fill="#c9604e" /></Svg>,
  maiz: () => <Svg><path d="M16 4c5 2 7 9 7 15 0 5-3 8-7 8s-7-3-7-8c0-6 2-13 7-15Z" fill="#f2c230" /><path d="M13 9v14M16 7v17M19 9v14M10 14h12M10 19h12" stroke="#c9961a" strokeWidth="1" /><path d="M16 27c-6 0-9-5-9-9 4 2 7 5 9 9ZM16 27c6 0 9-5 9-9-4 2-7 5-9 9Z" fill="#5a9a3a" /></Svg>,
  tomate: () => <Svg><circle cx="16" cy="18" r="11.5" fill="#d9382b" /><path d="M16 7l-3.5 3 3.5-.5 3.5.5ZM16 7v-3" stroke="#3f8a2f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="#3f8a2f" /><ellipse cx="11.5" cy="15" rx="2.4" ry="1.4" fill="#fff" opacity=".35" /></Svg>,
  chile: () => <Svg><path d="M21 8c4 0 6 3 5 8-1 7-8 12-17 13 6-3 9-7 10-12 .6-4 .6-9 2-9Z" fill="#e0452b" /><path d="M21 8c0-2 1-3 3-4M20 8c-1.500-.6-3-.4-4.500 0" fill="none" stroke="#3f8a2f" strokeWidth="2.2" strokeLinecap="round" /></Svg>,
  arroz: () => <Svg><path d="M7 28C9 16 14 8 26 4" fill="none" stroke="#7fae3f" strokeWidth="2" strokeLinecap="round" /><g fill="#e8cf6a"><ellipse cx="13" cy="14" rx="2.2" ry="3.6" transform="rotate(30 13 14)" /><ellipse cx="18" cy="9" rx="2.2" ry="3.6" transform="rotate(40 18 9)" /><ellipse cx="22" cy="14" rx="2.2" ry="3.6" transform="rotate(-20 22 14)" /><ellipse cx="14" cy="20" rx="2.2" ry="3.6" transform="rotate(-25 14 20)" /></g></Svg>,
  pina: () => <Svg><path d="M16 11l-4-7 4 3 4-3ZM16 11V2l-3 4 3 1 3-1-3-4" fill="#4f9a3a" /><ellipse cx="16" cy="20" rx="8.500" ry="10" fill="#f0a926" /><path d="M9 16l14 8M9 22l14-8M13 12l10 12M23 12L11 26" stroke="#b9721a" strokeWidth="1.1" /></Svg>,
  yuca: () => <Svg><path d="M25 5c2 6-1 14-8 19-4 3-9 4-12 3 1-3 3-7 8-11 4-3 8-7 12-11Z" fill="#a8764a" /><path d="M24 6c-4 4-8 7-12 10" fill="none" stroke="#e8d4b8" strokeWidth="1.600" strokeLinecap="round" /></Svg>,
  culantro: () => <Svg><path d="M16 29V15" stroke="#4f9a3a" strokeWidth="2" strokeLinecap="round" /><path d="M16 15c-6 1-9-3-8-7 5-1 8 2 8 7ZM16 15c6 1 9-3 8-7-5-1-8 2-8 7ZM16 19c-5 0-7-3-6-6 4 0 6 2 6 6ZM16 19c5 0 7-3 6-6-4 0-6 2-6 6Z" fill="#6fbf4a" /></Svg>,
};

/** Ícono del cultivo: dibujo propio (SVG) para cada cultivo; si no existe, una semilla. */
export function IconoCultivo({ id }: { id: string }) {
  const Dibujo = CULTIVOS[id];
  return Dibujo ? <Dibujo /> : <Icono nombre="sembrar" tam={24} />;
}


/** Emojis que aún llegan en los textos (idiomas) → su dibujo SVG. */
const EMOJI: Record<string, NombreIcono> = {
  '🧭': 'brujula', '🕒': 'reloj', '⚠️': 'alertas', '🌱': 'sembrar', '🌐': 'globo', '🌎': 'globo', '✅': 'check', '📵': 'sinsenal', '📍': 'pin',
  '🗓️': 'calendario', '💰': 'moneda', '🐛': 'plaga', '👥': 'usuarios', '🏡': 'finca', '🛰️': 'dron', '🛸': 'dron', '🌿': 'hoja', '⛰️': 'montana',
  '📒': 'libro', '➕': 'mas', '☀️': 'sol', '🌙': 'luna', '😀': 'feliz', '😐': 'normal', '😞': 'triste', '🍄': 'hongo', '🧬': 'adn', '🪱': 'gusano',
  '🌾': 'maleza', '❓': 'pregunta', '📷': 'camara', '🌡️': 'termometro', '🌧️': 'lluvia', '💧': 'gota', '🚰': 'grifo', '🟫': 'tierra', '♻️': 'reciclar',
  '🌋': 'volcan', '🗺️': 'mapa', '🔒': 'candado', '🎓': 'cursos', '🌳': 'arbol', '🏫': 'escuela', '💻': 'laptop', '🔀': 'mezcla', '🧺': 'canasta',
  '🧪': 'probeta', '📝': 'nota', '⏳': 'arena', '🔍': 'lupa', '✔': 'marca', '✕': 'cruz', '◐': 'medio',
};
const RE_EMOJI = new RegExp(`(${Object.keys(EMOJI).map((e) => e.replace(/[.*+?^${'$'}{}()|[\]\\]/g, '\\$&')).join('|')})`, 'u');

/** Texto con ícono SVG en lugar del emoji: <Tx>{'🔒 Pide entrar'}</Tx>. */
export function Tx({ children }: { children: string }) {
  return (
    <>
      {children.split(RE_EMOJI).map((parte, i) => (EMOJI[parte] ? <Icono key={i} nombre={EMOJI[parte]} tam={18} /> : parte))}
    </>
  );
}

export function BanderaCostaRica() {
  return (
    <svg viewBox="0 0 30 20" width="26" height="18" aria-hidden className="bandera">
      <rect width="30" height="20" fill="#002b7f" />
      <rect y="3.33" width="30" height="13.34" fill="#fff" />
      <rect y="6.67" width="30" height="6.66" fill="#ce1126" />
    </svg>
  );
}

export function BanderaEstadosUnidos() {
  const franjas = Array.from({ length: 7 }, (_, i) => (
    <rect key={i} y={(i * 2 * 20) / 13} width="30" height={20 / 13} fill="#b22234" />
  ));
  const estrellas = [];
  for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) estrellas.push(<circle key={`${f}-${c}`} cx={1.4 + c * 2.4 + (f % 2) * 1.2} cy={1.4 + f * 2.4} r=".55" fill="#fff" />);
  return (
    <svg viewBox="0 0 30 20" width="26" height="18" aria-hidden className="bandera">
      <rect width="30" height="20" fill="#fff" />
      {franjas}
      <rect width="13" height={(7 * 20) / 13} fill="#3c3b6e" />
      {estrellas}
    </svg>
  );
}

/** Franja de foto decorativa con efecto de profundidad al hacer scroll. */
export function FotoFranja({ foto }: { foto: 'agricultor' | 'mercado' | 'tormenta' | 'trabajadores' | 'cr-campos' | 'cr-cafe' }) {
  return (
    <div className="foto-parallax foto-franja" aria-hidden>
      <img src={`./imagenes/${foto}.jpg`} alt="" loading="lazy" />
    </div>
  );
}
