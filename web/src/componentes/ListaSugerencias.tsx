import { Link } from 'react-router-dom';
import { useT } from '../contexto/PreferenciasContext';
import type { Textos } from '../idiomas';
import type { Evitado, Motivo, Razon, Sugerencia } from '../logica/recomendacion';
import { catalogo } from '../servicios/algolia';
import { nombreCultivo, nombrePlaga } from '../utilidades';
import InsigniaNivel from './InsigniaNivel';
import { IconoCultivo } from './Iconos';

const minus = (s: string) => s.toLowerCase();

export function textoRazon(t: Textos, r: Razon): string {
  switch (r.tipo) {
    case 'corta': return t.siembra.razones.corta(minus(nombrePlaga(t, r.plaga)));
    case 'rotacion': return t.siembra.razones.rotacion(minus(nombreCultivo(t, r.cultivo)));
    case 'nitrogeno': return t.siembra.razones.nitrogeno;
    case 'zona': return t.siembra.razones.zona;
  }
}

export function textoMotivo(t: Textos, m: Motivo): string {
  switch (m.tipo) {
    case 'plaga': return t.siembra.motivos.plaga(minus(nombrePlaga(t, m.plaga)));
    case 'familia': return t.siembra.motivos.familia(minus(nombreCultivo(t, m.cultivo)));
    case 'comparte': return t.siembra.motivos.comparte(minus(nombreCultivo(t, m.cultivo)));
  }
}

export default function ListaSugerencias({
  sugerencias, evitados, accion,
}: {
  sugerencias: Sugerencia[];
  evitados: Evitado[];
  accion?: (cultivoId: string) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="lista-tarjetas rejilla-productos">
        {sugerencias.map(({ a, razones }, i) => {
          const nombre = nombreCultivo(t, a.cultivo_id, a.cultivo);
          return (
            <article key={a.objectID} className={`tarjeta nivel-${a.nivel}`}>
              <div className="tarjeta-cabeza">
                <span className="icono-cultivo" aria-hidden><IconoCultivo id={a.cultivo_id} /></span>
                <span className="tarjeta-titulo">
                  <strong>{i + 1}. {nombre}</strong>
                  <InsigniaNivel nivel={a.nivel} />
                </span>
              </div>
              <ul className="datos-rapidos">
                {razones.map((r) => <li key={r.tipo}>✔ {textoRazon(t, r)}</li>)}
              </ul>
              <div className="acciones">
                {accion && (
                  <button type="button" className="boton boton-pequeno" onClick={() => accion(a.cultivo_id)}>
                    {t.siembra.elegir(minus(nombre))}
                  </button>
                )}
                <Link className="boton boton-pequeno boton-secundario" to={`/cultivo/${a.cultivo_id}?zona=${a.codigo_distrito}`}>{t.comun.verMas}</Link>
              </div>
            </article>
          );
        })}
      </div>
      {evitados.length > 0 && (
        <details className="plegable">
          <summary>{t.siembra.evitar(evitados.length)}</summary>
          <ul className="lista-simple">
            {evitados.map((e) => <li key={e.cultivo}>✕ {nombreCultivo(t, e.cultivo)}: {textoMotivo(t, e.motivo)}.</li>)}
          </ul>
        </details>
      )}
    </>
  );
}
