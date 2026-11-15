import { Tx } from './Iconos';
import { useT } from '../contexto/PreferenciasContext';
import type { Nivel } from '../tipos';

// Color + ícono + texto: el nivel se entiende aunque no se distingan los colores.
const ICONOS: Record<Nivel, string> = { excelente: '✔', bueno: '◐', no_recomendado: '!', descartado: '✕' };

export default function InsigniaNivel({ nivel }: { nivel: Nivel }) {
  const t = useT();
  return (
    <span className={`insignia insignia-${nivel}`}>
      <span aria-hidden><Tx>{ICONOS[nivel]}</Tx></span> {t.niveles[nivel]}
    </span>
  );
}
