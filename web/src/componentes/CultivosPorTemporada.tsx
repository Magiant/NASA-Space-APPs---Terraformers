import { useState, type ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { proximosMeses } from '../logica/cursos';
import { MESES_AHORA, separarPorTemporada } from '../logica/temporada';
import type { RegistroAptitud } from '../tipos';
import TarjetaCultivo from './TarjetaCultivo';

type Vista = 'ahora' | 'todos';

/**
 * Los cultivos que se dan bien en un distrito, con dos vistas:
 * - Para sembrar ahora: los que se siembran este mes o en los dos siguientes (calendario MAG/INTA), numerados
 *   1, 2, 3… por puntaje (clima, agua, suelo, riesgos y precio en el mercado).
 * - Todos los cultivos: todos, se siembren cuando se siembren, por puntaje.
 * `cultivos` llega ya ordenado del mejor al peor; `limite` corta la lista (la ficha del distrito muestra 8).
 */
export default function CultivosPorTemporada({ cultivos, limite, alFinal, avisos }: { cultivos: RegistroAptitud[]; limite?: number; alFinal?: ReactNode; avisos?: Record<string, string> }) {
  const t = useT();
  const tt = t.temporada;
  const [vista, setVista] = useState<Vista>('ahora');
  if (!cultivos.length) return null;

  const { ahora, otrosMeses } = separarPorTemporada(cultivos);
  const meses = proximosMeses(MESES_AHORA);
  const rango = t.cursos.rangoMeses(t.meses[meses[0] - 1], t.meses[meses[meses.length - 1] - 1]);
  // Correccion - Poll: "Todos los cultivos" se cortaba a los 8 mejores y decia "8 cultivos" aunque hubiera 13 (y la
  // otra pestana ya prometia "otros 8"); ahora el limite solo aplica a "Para sembrar ahora" y "Todos" muestra todos.
  const lista = vista === 'ahora' ? ahora.slice(0, limite) : cultivos;

  return (
    <>
      <div className="interruptor" role="group" aria-label={tt.etiqueta}>
        <button type="button" aria-pressed={vista === 'ahora'} onClick={() => setVista('ahora')}>
          {tt.ahora}<small>{rango}</small>
        </button>
        <button type="button" aria-pressed={vista === 'todos'} onClick={() => setVista('todos')}>
          {tt.todos}<small>{tt.nCultivos(cultivos.length)}</small>
        </button>
      </div>
      <p className="ayuda temporada-explica">{vista === 'ahora' ? tt.explicaAhora(rango) : tt.explicaTodos}</p>

      {lista.length > 0 ? (
        <div className="lista-tarjetas rejilla-productos">
          {lista.map((a, i) => <TarjetaCultivo key={a.objectID} a={a} posicion={i + 1} aviso={avisos?.[a.cultivo_id]} />)}
          {alFinal}
        </div>
      ) : (
        <div className="aviso">
          <p>{tt.ninguno(rango)}</p>
        </div>
      )}

      {vista === 'ahora' && otrosMeses.length > 0 && (
        <p className="temporada-otros">
          {tt.otrosMeses(otrosMeses.length)}{' '}
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setVista('todos')}>{tt.verTodos}</button>
        </p>
      )}
    </>
  );
}
