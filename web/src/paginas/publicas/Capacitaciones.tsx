import { FotoFranja, Icono, IconoCultivo, Tx } from '../../componentes/Iconos';
import { useState } from 'react';
import { AvisoCopia, Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { cultivosDelCurso, epocaDelCurso, epocaDeLosMeses, esDeAgricultura, esParaCualquierCultivo, proximosMeses } from '../../logica/cursos';
import { algolia, catalogo } from '../../servicios/algolia';
import type { RegistroCapacitacion } from '../../tipos';
import { nombreCultivo, nombrePlaga, traducirDato, useCargar, useZonaElegida } from '../../utilidades';

type Vista = 'recomendados' | 'todos';

/**
 * Cursos para el agricultor. Dos vistas:
 * - Recomendados: cursos de los cultivos que se siembran en los próximos 3 meses (si eligió su zona, solo los que
 *   se dan bien ahí) y los de la época que viene (riego para la seca; drenaje y suelos para la lluviosa).
 * - Todos los meses: todos los cursos.
 * En las dos se puede filtrar por cultivo y por tema.
 */
// Correccion - Poll: los cultivos recomendados abrian la ficha del cultivo en vez de filtrar los cursos; ahora filtran.
// Correccion - Poll: con la app en ingles los temas salian en español ("Plagas"); decia "1 cursos" y "1 horas"; y sin
// cursos con los filtros no habia como quitarlos. Ahora los temas se traducen, el singular es correcto y hay un boton
// "Quitar los filtros".
export default function Capacitaciones() {
  const t = useT();
  const tc = t.cursos;
  const cursos = useCargar(() => algolia.capacitaciones(), [], 'tf-copia-cursos');
  const [vista, setVista] = useState<Vista>('recomendados');
  const [cultivo, setCultivo] = useState('');
  const [tema, setTema] = useState('');
  const [zona] = useZonaElegida();
  const lugar = zona ? catalogo.zona(zona) : undefined;
  const aptitud = useCargar(() => (zona ? algolia.aptitudDeZona(zona) : Promise.resolve(null)), [zona]);

  // Cultivos que se siembran en los próximos meses (calendario MAG/INTA); con zona, solo los que se dan bien ahí.
  const meses = proximosMeses(3);
  const porCalendario = catalogo.cultivos.filter((c) => c.meses_siembra.some((m) => meses.includes(m))).map((c) => c.id);
  const aptos = aptitud.datos ? new Set(aptitud.datos.filter((a) => a.nivel === 'excelente' || a.nivel === 'bueno').map((a) => a.cultivo_id)) : null;
  const enZona = aptos ? porCalendario.filter((id) => aptos.has(id)) : [];
  const recomendados = enZona.length ? enZona : porCalendario;
  const epoca = epocaDeLosMeses(meses, zona);
  const rango = tc.rangoMeses(t.meses[meses[0] - 1], t.meses[meses[meses.length - 1] - 1]);

  // Correccion - Poll: con "Lo que siembro: Maíz" se podía elegir el tema "Ganadería", que no tiene sentido. Por ahora
  // la página es solo para agricultura: sin los cursos de ganadería, forestal ni asadas (logica/cursos.ts).
  const todos = (cursos.datos ?? []).filter(esDeAgricultura);
  const temas = [...new Set(todos.map((c) => c.tema.split(' · ')[0]))];
  const esRecomendado = (c: RegistroCapacitacion) =>
    cultivosDelCurso(c).some((id) => recomendados.includes(id)) || (!!epoca && epocaDelCurso(c) === epoca);

  // Correccion - Poll: ningun curso del INA trae el cultivo enlazado, asi que "Lo que siembro" mostraba todos
  // (tambien los de ganaderia y forestal). Ahora muestra los de ese cultivo y los de agricultura para cualquier cultivo.
  const sirveParaCultivo = (c: RegistroCapacitacion) => {
    const plagas = catalogo.cultivo(cultivo)?.plagas ?? [];
    return cultivosDelCurso(c).includes(cultivo) || (!!c.plaga_id && plagas.includes(c.plaga_id)) || esParaCualquierCultivo(c);
  };
  const lista = todos
    .filter((c) => (vista === 'todos' || esRecomendado(c)) && (!tema || c.tema.startsWith(tema)) && (!cultivo || sirveParaCultivo(c)))
    // Primero los cursos del cultivo (o de los cultivos recomendados); después los generales.
    .sort((a, b) => Number(cultivosDelCurso(b).length > 0) - Number(cultivosDelCurso(a).length > 0));

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{tc.titulo}</h1>
        <p>{tc.subtitulo}</p>
        {/* Correccion - Poll: no se decia como inscribirse en un curso. */}
        <p className="ayuda">{tc.comoInscribirse}</p>
      </header>
      <FotoFranja foto="agricultor" />

      <div className="interruptor" role="group" aria-label={tc.titulo}>
        <button type="button" aria-pressed={vista === 'recomendados'} onClick={() => setVista('recomendados')}>
          {tc.recomendados}<small>{rango}</small>
        </button>
        <button type="button" aria-pressed={vista === 'todos'} onClick={() => setVista('todos')}>
          {tc.todosMeses}<small>{tc.nCursos(todos.length)}</small>
        </button>
      </div>

      {vista === 'recomendados' && (
        <section className="tarjeta cursos-motivo" aria-label={tc.porQue}>
          <p>{tc.paraSembrar(rango, enZona.length && lugar ? lugar.distrito : null)}</p>
          <ul className="chips">
            {recomendados.map((id) => (
              <li key={id}>
                {/* Filtra los cursos (lo mismo que "Lo que siembro"); tocarlo otra vez quita el filtro. */}
                <button type="button" className="chip chip-cultivo" aria-pressed={cultivo === id} onClick={() => setCultivo(cultivo === id ? '' : id)}>
                  <IconoCultivo id={id} /> {nombreCultivo(t, id)}
                </button>
              </li>
            ))}
          </ul>
          <p className="ayuda">{tc.toqueUno}</p>
          {epoca &&<p className="ayuda"><Icono nombre={epoca === 'seca' ? 'sol' : 'lluvia'} tam={16} /> {epoca === 'seca' ? tc.epocaSeca : tc.epocaLluviosa}</p>}
        </section>
      )}

      <div className="filtros">
        <label>
          {tc.loQueSiembro}
          <select value={cultivo} onChange={(e) => setCultivo(e.target.value)}>
            <option value="">{tc.todos}</option>
            {catalogo.cultivos.map((c) => <option key={c.id} value={c.id}>{nombreCultivo(t, c.id, c.nombre)}</option>)}
          </select>
        </label>
        <label>
          {tc.tema}
          <select value={tema} onChange={(e) => setTema(e.target.value)}>
            <option value="">{tc.todosTemas}</option>
            {temas.map((x) => <option key={x} value={x}>{traducirDato(t, x)}</option>)}
          </select>
        </label>
      </div>

      {cursos.cargando && <Cargando />}
      {cursos.error && <ErrorCarga mensaje={cursos.error} reintentar={cursos.recargar} />}
      <AvisoCopia cuando={cursos.guardadoEl} />
      {!cursos.cargando && !cursos.error && lista.length === 0 && (
        <div className="aviso">
          <p>{vista === 'recomendados' ? tc.sinRecomendados : tc.sinCursos}</p>
          {vista === 'recomendados' && <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setVista('todos')}>{tc.verTodos}</button>}
          {(cultivo || tema) && <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => { setCultivo(''); setTema(''); }}>{tc.quitarFiltros}</button>}
        </div>
      )}

      <div className="lista-tarjetas lista-cursos">
        {lista.map((c) => {
          const [area, tipo] = c.tema.split(' · ');
          const para = cultivosDelCurso(c);
          const porEpoca = vista === 'recomendados' && !!epoca && epocaDelCurso(c) === epoca;
          return (
            <article key={c.objectID} className="tarjeta tarjeta-curso">
              <p className="etiqueta" title={c.tema}>{traducirDato(t, area)}</p>
              <h2 className="tarjeta-h">{c.titulo}</h2>
              <ul className="datos-rapidos">
                {/* Correccion - Poll: una modalidad desconocida dejaba la linea vacia (" · 40 horas"). */}
                <li><Tx>{tc.modalidad[c.modalidad] ?? c.modalidad}</Tx>{c.duracion_horas ? ` · ${tc.horas(c.duracion_horas)}` : ''}{tipo ? ` · ${traducirDato(t, tipo)}` : ''}</li>
                {/* Correccion - Poll: sin provincias se veia el icono solo; ahora la linea no aparece. */}
                {c.provincias.length > 0 && <li><Icono nombre="pin" tam={16} /> {c.provincias.join(', ')}</li>}
                {para.length > 0 && <li className="curso-para"><Icono nombre="sembrar" tam={16} /> {tc.para} {para.map((id) => nombreCultivo(t, id)).join(' · ')}</li>}
                {porEpoca && <li className="curso-para"><Icono nombre={epoca === 'seca' ? 'sol' : 'lluvia'} tam={16} /> {epoca === 'seca' ? tc.paraEpocaSeca : tc.paraEpocaLluviosa}</li>}
                {c.plaga_id && <li><Icono nombre="plaga" tam={16} /> {tc.ayudaCon} {nombrePlaga(t, c.plaga_id)}</li>}
              </ul>
              {/* Correccion - Poll: el enlace del curso no se revisaba; solo se usa si es una direccion web (http o https). */}
              {/* Correccion - Poll: sin direccion valida quedaba un boton que no hacia nada; ahora se dice donde preguntar. */}
              {/^https?:\/\//i.test(c.url) ? (
                <a className="boton boton-secundario" href={c.url} target="_blank" rel="noreferrer">
                  {tc.verEn(c.institucion)}
                </a>
              ) : (
                <p className="ayuda">{tc.sinEnlace(c.institucion)}</p>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
