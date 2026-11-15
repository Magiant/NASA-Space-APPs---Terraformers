import { FotoFranja, Icono, Tx } from '../../componentes/Iconos';
import { useState } from 'react';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia, catalogo } from '../../servicios/algolia';
import { nombreCultivo, nombrePlaga, useCargar } from '../../utilidades';

export default function Capacitaciones() {
  const t = useT();
  const tc = t.cursos;
  const cursos = useCargar(() => algolia.capacitaciones(), []);
  const [cultivo, setCultivo] = useState('');
  const [tema, setTema] = useState('');
  const temas = [...new Set((cursos.datos ?? []).map((c) => c.tema))];
  const lista = (cursos.datos ?? []).filter((c) => {
    if (tema && c.tema !== tema) return false;
    if (cultivo) {
      const plagas = catalogo.cultivo(cultivo)?.plagas ?? [];
      return c.cultivo_id === cultivo || (c.plaga_id && plagas.includes(c.plaga_id)) || c.cultivo_id === null;
    }
    return true;
  });

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

      <div className="lista-tarjetas">
        {lista.map((c) => (
          <article key={c.objectID} className="tarjeta">
            <p className="etiqueta">{c.tema}</p>
            <h2 className="tarjeta-h">{c.titulo}</h2>
            <ul className="datos-rapidos">
              <li><Tx>{tc.modalidad[c.modalidad]}</Tx> · {c.duracion_horas} {tc.horas}</li>
              <li><Icono nombre="pin" tam={16} /> {c.provincias.join(', ')}</li>
              {c.plaga_id && <li><Icono nombre="plaga" tam={16} /> {tc.ayudaCon} {nombrePlaga(t, c.plaga_id)}</li>}
            </ul>
            <a className="boton boton-secundario" href={c.url} target="_blank" rel="noreferrer">
              {tc.verEn(c.institucion)}
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
