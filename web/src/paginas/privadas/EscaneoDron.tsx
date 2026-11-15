import { Icono, Tx } from '../../componentes/Iconos';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import SeccionFondo from '../../componentes/SeccionFondo';
import { Cargando, Vacio } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { datos } from '../../servicios/supabase';
import type { VueloDron } from '../../tipos';
import { fecha, useCargar } from '../../utilidades';

type Salud = 'sana' | 'estres' | 'critica';

/** NDVI → qué tan sanas y verdes están las plantas. */
const salud = (ndvi: number): Salud => (ndvi >= 0.6 ? 'sana' : ndvi >= 0.4 ? 'estres' : 'critica');

function Mapa({ v }: { v: VueloDron }) {
  const t = useT();
  return (
    <figure className="mapa-dron">
      <div className="mapa-cuadricula" style={{ gridTemplateColumns: `repeat(${v.cuadricula[0].length}, 1fr)` }} role="img" aria-label={t.dron.mapaAria}>
        {v.cuadricula.flatMap((fila, f) =>
          fila.map((n, c) => {
            const s = salud(n);
            return <span key={`${f}-${c}`} className={`celda celda-${s}`} title={`${t.dron.salud[s]} (${n})`}>{s === 'critica' ? '!' : ''}</span>;
          }),
        )}
      </div>
      <figcaption className="leyenda">
        <span><i className="celda-sana" /> {t.dron.leyenda.sana}</span>
        <span><i className="celda-estres" /> {t.dron.leyenda.estres}</span>
        <span><i className="celda-critica" /> {t.dron.leyenda.critica}</span>
      </figcaption>
    </figure>
  );
}

export default function EscaneoDron() {
  const t = useT();
  const td = t.dron;
  const { fincaId } = useParams();
  const navegar = useNavigate();
  const fincas = useCargar(() => datos.misFincas(), []);
  const vuelos = useCargar(() => (fincaId ? datos.vuelosDron(fincaId) : Promise.resolve([])), [fincaId]);
  const [elegido, setElegido] = useState(0);

  // Sin finca en la URL: abrir la primera.
  useEffect(() => {
    if (!fincaId && fincas.datos?.length) navegar(`/dron/${fincas.datos[0].id}`, { replace: true });
  }, [fincaId, fincas.datos, navegar]);

  if (fincas.cargando || vuelos.cargando) return <Cargando />;
  if (!fincas.datos?.length) {
    return (
      <Vacio icono={<Icono nombre="dron" tam={48} />} titulo={t.fincas.primero}>
        <Link to="/fincas/nueva" className="boton">{t.fincas.registrarFinca}</Link>
      </Vacio>
    );
  }

  const finca = fincas.datos.find((f) => f.id === fincaId);
  const lista = vuelos.datos ?? [];
  const v = lista[elegido];
  const anterior = lista[elegido + 1];
  const s = v ? salud(v.ndvi_promedio) : null;

  return (
    <>
      <header className="cabecera-pagina">
        <h1><Tx>{td.titulo}</Tx></h1>
        <label className="campo-suelto">
          {td.finca}
          <select value={fincaId} onChange={(e) => { setElegido(0); navegar(`/dron/${e.target.value}`); }}>
            {fincas.datos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </label>
      </header>

      <SeccionFondo foto="ndvi" titulo={t.fondos.ndvi.titulo} etiquetaCredito={t.fondos.credito} alto="bajo">
        <p>{t.fondos.ndvi.texto}</p>
      </SeccionFondo>

      {!v ? (
        <Vacio icono={<Icono nombre="dron" tam={48} />} titulo={td.sinVuelos(finca?.nombre ?? td.esta)}>
          <p>{td.sinVuelosTexto}</p>
          <button className="boton" disabled>{td.pedir}</button>
        </Vacio>
      ) : (
        <div className="columnas">
          <div className="col-principal">
            <h2 style={{ marginTop: 0 }}>{td.mapa}</h2>
            <Mapa v={v} />
            {v.area_estres_pct > 10 && (
              <p className="aviso">
                {td.revise} <Link to="/reportar-plaga">{t.plaga.titulo}</Link>
              </p>
            )}
          </div>

          <aside className="col-lateral">
            {lista.length > 1 && (
              <div className="chips" role="radiogroup" aria-label={td.fechaVuelo}>
                {lista.map((x, i) => (
                  <button key={x.id} type="button" role="radio" aria-checked={i === elegido} className="chip" onClick={() => setElegido(i)}>
                    {fecha(x.fecha)}
                  </button>
                ))}
              </div>
            )}
            <AvisoActualizado que={td.datosVuelo} cuando={v.fecha} />
            <div className="fichas" style={{ gridTemplateColumns: '1fr' }}>
              <div className={`ficha salud-${s}`}>
                <span className="ficha-icono" aria-hidden><Icono nombre="hoja" tam={24} /></span>
                <span className="ficha-titulo">{td.plantas}</span>
                <strong className="ficha-valor">{td.salud[s!]}</strong>
                <span className="ficha-detalle">
                  {td.indice(v.ndvi_promedio)}
                  {anterior && ` (${v.ndvi_promedio >= anterior.ndvi_promedio ? td.mejor : td.peor})`}
                </span>
              </div>
              <div className="ficha">
                <span className="ficha-icono" aria-hidden><Icono nombre="alertas" tam={24} /></span>
                <span className="ficha-titulo">{td.areaEstres}</span>
                <strong className="ficha-valor">{v.area_estres_pct} %</strong>
              </div>
              <div className="ficha">
                <span className="ficha-icono" aria-hidden><Icono nombre="montana" tam={24} /></span>
                <span className="ficha-titulo">{td.pendiente}</span>
                <strong className="ficha-valor">{v.pendiente_pct} %</strong>
                <span className="ficha-detalle">{v.pendiente_pct > 30 ? td.pendienteFuerte : td.pendienteSuave}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
