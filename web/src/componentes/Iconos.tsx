// Íconos dibujados en SVG: se ven igual en todos los celulares y computadoras
// (los emojis de bandera, por ejemplo, en Windows salen como letras).
import { catalogo } from '../servicios/algolia';

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

const ESPECIALES: Record<string, () => JSX.Element> = {
  cafe: GranoCafe,
};

/** Ícono del cultivo: SVG propio si existe, si no el emoji del catálogo. */
export function IconoCultivo({ id }: { id: string }) {
  const Especial = ESPECIALES[id];
  if (Especial) return <Especial />;
  return <>{catalogo.cultivo(id)?.icono ?? '🌱'}</>;
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
