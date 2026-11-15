import { Link } from 'react-router-dom';
import { useT } from '../contexto/PreferenciasContext';
import { catalogo } from '../servicios/algolia';
import type { Notas, RegistroAptitud } from '../tipos';
import { colones, mes, nombreCultivo, nombrePlaga } from '../utilidades';
import InsigniaNivel from './InsigniaNivel';
import { Icono, IconoCultivo } from './Iconos';

const PARTES = ['clima', 'suelo', 'agua', 'mercado'] as const;

function frase(valor: number, frases: [string, string, string]) {
  return valor >= 80 ? frases[0] : valor >= 60 ? frases[1] : frases[2];
}

/** Puntaje por partes explicado en palabras simples. */
export function DesgloseNotas({ notas }: { notas: Notas }) {
  const t = useT();
  const r = t.desglose.riesgo;
  return (
    <ul className="desglose">
      {PARTES.map((p) => (
        <li key={p}>
          <div className="desglose-fila">
            <span>{t.desglose[p].nombre}</span>
            <span>{frase(notas[p], t.desglose[p].frases)}</span>
          </div>
          <div className="barra" aria-hidden>
            <span style={{ width: `${notas[p]}%` }} className={notas[p] >= 80 ? 'alta' : notas[p] >= 60 ? 'media' : 'baja'} />
          </div>
        </li>
      ))}
      <li>
        <div className="desglose-fila">
          <span>{r.nombre}</span>
          <span>{notas.riesgo >= 40 ? r.frases[0] : notas.riesgo >= 20 ? r.frases[1] : r.frases[2]}</span>
        </div>
        <div className="barra barra-riesgo" aria-hidden>
          <span style={{ width: `${notas.riesgo}%` }} />
        </div>
      </li>
    </ul>
  );
}

export default function TarjetaCultivo({ a, posicion }: { a: RegistroAptitud; posicion?: number }) {
  const t = useT();
  const c = catalogo.cultivo(a.cultivo_id);
  const plagas = (c?.plagas ?? []).filter((id) => a.plagas_zona.includes(catalogo.plaga(id)?.nombre ?? ''));
  return (
    <article className={`tarjeta tarjeta-cultivo nivel-${a.nivel}`}>
      <Link to={`/cultivo/${a.cultivo_id}?zona=${a.codigo_distrito}`} className="tc-enlace">
        <span className="tc-arriba">
          <span className="icono-cultivo" aria-hidden><IconoCultivo id={a.cultivo_id} /></span>
          {a.nivel !== 'descartado' && (
            <span className="puntaje" aria-label={t.tarjeta.puntaje(a.puntaje)}>
              {a.puntaje}
              <small>/100</small>
            </span>
          )}
        </span>
        <strong className="tc-nombre">
          {posicion ? <span className="tc-posicion">{posicion}</span> : null}
          {nombreCultivo(t, a.cultivo_id, a.cultivo)}
        </strong>
        <InsigniaNivel nivel={a.nivel} />
      </Link>

      {a.nivel === 'descartado' ? (
        <p className="motivo">{a.motivo_descarte}</p>
      ) : (
        <>
          <dl className="tc-datos">
            <div>
              <dt><Icono nombre="calendario" tam={16} /> {t.tarjeta.epoca}</dt>
              <dd>{mes(t, a.mes_siembra)}</dd>
            </div>
            {a.precio_referencia && (
              <div>
                <dt><Icono nombre="moneda" tam={16} /> {t.tarjeta.precio}</dt>
                <dd>
                  {colones(a.precio_referencia.valor)} <small>{t.tarjeta.por} {a.precio_referencia.unidad}</small>
                </dd>
              </div>
            )}
            {plagas.length > 0 && (
              <div>
                <dt><Icono nombre="plaga" tam={16} /> {t.tarjeta.cuidado}</dt>
                <dd className="tc-plagas">{plagas.map((id) => nombrePlaga(t, id)).join(', ')}</dd>
              </div>
            )}
          </dl>
          <details>
            <summary>{t.tarjeta.porQue}</summary>
            <DesgloseNotas notas={a.notas} />
          </details>
        </>
      )}
    </article>
  );
}
