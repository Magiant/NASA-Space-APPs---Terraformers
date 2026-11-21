import { FotoAlerta, Icono } from '../../componentes/Iconos';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { PronosticoZona } from '../../componentes/Pronostico';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia, catalogo } from '../../servicios/algolia';
import { fecha, useCargar, useZonaElegida } from '../../utilidades';

/**
 * Pestaña "Tiempo" (ruta /alertas): dos botones juntos, "Tiempo" y "Alertas", que cambian la vista:
 * - Tiempo: el pronóstico de su zona (ahora, hora por hora y los próximos días).
 * - Alertas: los avisos oficiales de la CNE y del IMN.
 * La vista va en la dirección (/alertas?ver=alertas) para poder enlazar directo a las alertas.
 * La zona es la misma de Sembrar; si aún no la eligió, en Tiempo puede elegir provincia, cantón y distrito.
 */
export default function Alertas() {
  const t = useT();
  const ta = t.alertas;
  const [params, setParams] = useSearchParams();
  const vista = params.get('ver') === 'alertas' ? 'alertas' : 'tiempo';
  const verVista = (v: 'tiempo' | 'alertas') => setParams(v === 'alertas' ? { ver: 'alertas' } : {}, { replace: true });
  const [zona, setZona] = useZonaElegida();
  const [soloMiZona, setSoloMiZona] = useState(!!zona);
  // Al elegir un distrito aquí, las alertas pasan a ser las de ese distrito.
  const cambiarZona = (c: string | null) => {
    setZona(c);
    if (c) setSoloMiZona(true);
  };
  const alertas = useCargar(() => algolia.alertas(soloMiZona && zona ? zona : undefined), [soloMiZona, zona]);
  const nombreZona = zona ? catalogo.zona(zona)?.distrito : null;
  const resumen = (texto: string) => {
    if (texto.length <= 150) return texto;
    const corte = texto.slice(0, 150);
    return `${corte.slice(0, corte.lastIndexOf(' '))}…`;
  };

  return (
    <>
      <header className="alertas-portada">
        <img src="./imagenes/tormenta.jpg" alt="" aria-hidden />
        <div className="alertas-portada-texto">
          <span><Icono nombre="nubeSol" tam={18} /> {ta.portada}</span>
          <h1>{ta.titulo}</h1>
          <p>{ta.subtitulo}</p>
        </div>
      </header>

      {/* Dos botones juntos: cada uno abre su propia vista. */}
      <div className="interruptor pestanas-tiempo" role="tablist" aria-label={ta.titulo}>
        <button type="button" role="tab" id="pestana-tiempo" aria-controls="vista-tiempo"
          aria-selected={vista === 'tiempo'} onClick={() => verVista('tiempo')}>
          <Icono nombre="nubeSol" tam={24} /> {ta.pestanaTiempo}
        </button>
        <button type="button" role="tab" id="pestana-alertas" aria-controls="vista-alertas"
          aria-selected={vista === 'alertas'} onClick={() => verVista('alertas')}>
          <Icono nombre="alertas" tam={24} /> {ta.tituloAlertas}
          {!!alertas.datos?.length && <span className="pestana-cuenta" aria-label={ta.cuantas(alertas.datos.length)}>{alertas.datos.length}</span>}
        </button>
      </div>

      {vista === 'tiempo' ? (
        <div role="tabpanel" id="vista-tiempo" aria-labelledby="pestana-tiempo">
          <PronosticoZona codigo={zona} alCambiar={cambiarZona} detalle />
        </div>
      ) : (
        <div role="tabpanel" id="vista-alertas" aria-labelledby="pestana-alertas">
          <p className="ayuda">{ta.ayudaAlertas}</p>

          {nombreZona && (
            <div className="interruptor" role="tablist">
              <button role="tab" aria-selected={soloMiZona} onClick={() => setSoloMiZona(true)}>{ta.en(nombreZona)}</button>
              <button role="tab" aria-selected={!soloMiZona} onClick={() => setSoloMiZona(false)}>{ta.todoPais}</button>
            </div>
          )}

          {alertas.cargando && <Cargando />}
          {alertas.error && <ErrorCarga mensaje={alertas.error} reintentar={alertas.recargar} />}
          {alertas.datos?.length === 0 && (
            <Vacio icono={<Icono nombre="sol" tam={48} />} titulo={ta.noHay}>
              <p>{ta.noHayTexto(soloMiZona)}</p>
            </Vacio>
          )}

          <div className="lista-alertas">
            {alertas.datos?.map((a) => {
              const zonas = a.codigos_distrito.map((c) => catalogo.zona(c)).filter(Boolean);
              return <article key={a.objectID} className={`alerta alerta-${a.nivel}`}>
                <div className="alerta-visual">
                  <FotoAlerta tipo={`${a.tipo} ${a.titulo} ${a.descripcion}`} etiqueta={t.cultivo.foto} />
                  <span className={`alerta-nivel alerta-nivel-${a.nivel}`}>
                    <Icono nombre="alertas" tam={17} /> {ta.nivel[a.nivel]}
                  </span>
                </div>
                <div className="alerta-cuerpo">
                  <p className="alerta-fuente">{a.fuente} <span aria-hidden>·</span> {a.tipo}</p>
                  <h3>{a.titulo}</h3>
                  <p className="alerta-descripcion">{resumen(a.descripcion)}</p>
                  {a.descripcion.length > 150 && (
                    <details className="alerta-detalles">
                      <summary>{ta.verCompleto}</summary>
                      <p>{a.descripcion}</p>
                    </details>
                  )}
                  <div className="alerta-pie">
                    <p className="alerta-fechas">
                      <Icono nombre="reloj" tam={16} />
                      {ta.desde} {fecha(a.inicio)}{a.fin ? ` ${ta.hasta} ${fecha(a.fin)}` : ''}
                    </p>
                    <div className="alerta-ubicaciones">
                      <Icono nombre={zonas.length ? 'pin' : 'globo'} tam={16} />
                      {zonas.length ? zonas.map((z) => (
                        <Link key={z!.codigo_distrito} to={`/zona/${z!.codigo_distrito}`}>{z!.distrito}</Link>
                      )) : <span>{ta.todoPais}</span>}
                    </div>
                  </div>
                </div>
              </article>;
            })}
          </div>
        </div>
      )}
    </>
  );
}
