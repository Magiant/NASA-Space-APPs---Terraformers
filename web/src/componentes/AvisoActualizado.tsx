import { Icono } from './Iconos';
import { useT } from '../contexto/PreferenciasContext';
import { fecha } from '../utilidades';

/** Siempre decir de cuándo es el dato. */
export default function AvisoActualizado({ que, cuando, fuente }: { que?: string; cuando: string; fuente?: string }) {
  const t = useT();
  return (
    <p className="actualizado">
      <Icono nombre="reloj" tam={16} /> {t.comun.actualizados(que ?? t.comun.datos)} <strong>{fecha(cuando)}</strong>
      {fuente && <> · {t.comun.fuente}: {fuente}</>}
    </p>
  );
}
