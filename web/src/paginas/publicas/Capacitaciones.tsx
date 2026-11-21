import { FotoFranja, Icono, Tx } from '../../componentes/Iconos';
import { useState } from 'react';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { cultivosDelCurso, esParaCualquierCultivo } from '../../logica/cursos';
import { algolia, catalogo } from '../../servicios/algolia';
import type { RegistroCapacitacion } from '../../tipos';
import { nombreCultivo, nombrePlaga, useCargar } from '../../utilidades';

export default function Capacitaciones() {
  const t = useT();
  const tc = t.cursos;
  const cursos = useCargar(() => algolia.capacitaciones(), []);
  const [cultivo, setCultivo] = useState('');
  const [tema, setTema] = useState('');
  const todos = cursos.datos ?? [];
  // El tema viene como "Agricultura · Capacitación": el filtro y la etiqueta usan solo el área (antes del punto).
  const temas = [...new Set(todos.map((c) => c.tema.split(' · ')[0]))];

  // Correccion - Poll: ningun curso del INA trae el cultivo enlazado, asi que "Lo que siembro" mostraba todos
  // (tambien los de ganaderia y forestal). Ahora muestra los de ese cultivo y los de agricultura para cualquier cultivo.
  const sirveParaCultivo = (c: RegistroCapacitacion) => {
    const plagas = catalogo.cultivo(cultivo)?.plagas ?? [];
    return cultivosDelCurso(c).includes(cultivo) || (!!c.plaga_id && plagas.includes(c.plaga_id)) || esParaCualquierCultivo(c);
  };
  const lista = todos
    .filter((c) => (!tema || c.tema.startsWith(tema)) && (!cultivo || sirveParaCultivo(c)))
    // Primero los cursos de un cultivo; después los generales.
    .sort((a, b) => Number(cultivosDelCurso(b).length > 0) - Number(cultivosDelCurso(a).length > 0));

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{tc.titulo}</h1>
        <p>{tc.subtitulo}</p>
      </header>
      <FotoFranja foto="agricultor" />

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
            {temas.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>

      {cursos.cargando && <Cargando />}
      {cursos.error && <ErrorCarga mensaje={cursos.error} reintentar={cursos.recargar} />}

      <div className="lista-tarjetas lista-cursos">
        {lista.map((c) => {
          const [area, tipo] = c.tema.split(' · ');
          const para = cultivosDelCurso(c);
          return (
            <article key={c.objectID} className="tarjeta tarjeta-curso">
              <p className="etiqueta" title={c.tema}>{area}</p>
              <h2 className="tarjeta-h">{c.titulo}</h2>
              <ul className="datos-rapidos">
                <li><Tx>{tc.modalidad[c.modalidad]}</Tx> · {c.duracion_horas} {tc.horas}{tipo ? ` · ${tipo}` : ''}</li>
                <li><Icono nombre="pin" tam={16} /> {c.provincias.join(', ')}</li>
                {para.length > 0 && <li className="curso-para"><Icono nombre="sembrar" tam={16} /> {tc.para} {para.map((id) => nombreCultivo(t, id)).join(' · ')}</li>}
                {c.plaga_id && <li><Icono nombre="plaga" tam={16} /> {tc.ayudaCon} {nombrePlaga(t, c.plaga_id)}</li>}
              </ul>
              <a className="boton boton-secundario" href={c.url} target="_blank" rel="noreferrer">
                {tc.verEn(c.institucion)}
              </a>
            </article>
          );
        })}
      </div>
    </>
  );
}
