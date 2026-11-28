import { Icono, Tx } from '../../componentes/Iconos';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { useAuth } from '../../contexto/AuthContext';
import MapaFinca3D from '../../componentes/MapaFinca3D';
import { guardar, leer } from '../../servicios/almacen';
import { useT } from '../../contexto/PreferenciasContext';
import { datos } from '../../servicios/supabase';
import { modoRealActual } from '../../servicios/cliente';
import { BASE_INICIAL } from '../../datos-ejemplo/privados';
import type { Finca, VueloDron } from '../../tipos';
import { clave, esArea, esLinea, esPunto, ESTILO, usosNoAgricolas, zonasProteccion } from '../../logica/elementosFinca';
import { copiaPrivada, fecha, hoy, useCargar } from '../../utilidades';

/**
 * Escaneo con dron de una finca, pensado para leerse en el campo:
 *   1. Portada: qué finca, de qué vuelo (y cambiar de finca o de vuelo).
 *   2. Resumen en palabras: cómo están las plantas y si mejoró desde el vuelo anterior.
 *   3. Mapa por parcelas con nombre (filas A, B, C… y columnas 1, 2, 3…): al tocar una se ve qué tiene
 *      y qué hacer. Vista "Cambios" contra el vuelo anterior.
 *   4. Qué hacer, con las parcelas a revisar por su nombre y las zonas de protección de ríos y nacientes.
 * Si el vuelo trae elementos (ríos, caminos, agua, bosque, casas…), se dibujan en el mapa; las parcelas
 * de agua, bosque o construcciones no cuentan como cultivo.
 * El color nunca va solo: cada estado lleva además un símbolo y su nombre escrito.
 */

type Salud = 'sana' | 'estres' | 'critica';
type Cambio = 'mejor' | 'igual' | 'peor';
type Vista = 'salud' | 'cambios';
type Modo = '3d' | 'plano';
const CLAVE_MODO = 'tf-dron-modo';

/** NDVI (índice verde, 0 a 1) → qué tan sanas y verdes están las plantas. */
const salud = (ndvi: number): Salud => (ndvi >= 0.6 ? 'sana' : ndvi >= 0.4 ? 'estres' : 'critica');
/** Diferencias de menos de 0,05 se toman como "igual" (ruido normal entre vuelos). */
const cambio = (antes: number, ahora: number): Cambio => (ahora - antes >= 0.05 ? 'mejor' : antes - ahora >= 0.05 ? 'peor' : 'igual');
const FILAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nombreParcela = (f: number, c: number) => `${FILAS[f] ?? f + 1}${c + 1}`;
const SIMBOLO: Record<Salud | Cambio, string> = { sana: '', estres: '•', critica: '!', mejor: '▲', igual: '', peor: '▼' };
/** Mismos colores que el plano 2D (.dron-celda.estado-*), para dibujar el 3D. */
const COLOR: Record<Salud | Cambio, string> = { sana: '#2f8a3e', estres: '#d9a400', critica: '#c0391b', mejor: '#2f8a3e', igual: '#8d978f', peor: '#c0391b' };
// Correccion - Poll: el indice verde salia con punto ("0.74 de 1"); ahora con la coma del idioma ("0,74 de 1").
const dos = (n: number, locale: string) => n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Fincas de ejemplo (datos inventados) para ver cómo se ve un escaneo aunque la cuenta real todavía
 * no tenga vuelos. En modo demo ya son las fincas de la cuenta de prueba; con Supabase se agregan
 * aparte, marcadas como ejemplo, y nunca se guardan en la base.
 */
const PREFIJO_EJEMPLO = 'ejemplo-';
const FINCAS_EJEMPLO: Finca[] = BASE_INICIAL.fincas
  .filter((x) => BASE_INICIAL.vuelos.some((v) => v.finca_id === x.id))
  .map((x) => ({ ...x, id: PREFIJO_EJEMPLO + x.id }));
const esEjemplo = (id?: string) => !!id?.startsWith(PREFIJO_EJEMPLO);
const vuelosEjemplo = (id: string): VueloDron[] =>
  BASE_INICIAL.vuelos.filter((v) => v.finca_id === id.slice(PREFIJO_EJEMPLO.length)).sort((a, b) => b.fecha.localeCompare(a.fecha));

export default function EscaneoDron() {
  const t = useT();
  const td = t.dron;
  const { fincaId } = useParams();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const fincas = useCargar(() => datos.misFincas(), [], copiaPrivada(usuario?.id, 'fincas'));
  const vuelos = useCargar(
    () => (!fincaId ? Promise.resolve([]) : esEjemplo(fincaId) ? Promise.resolve(vuelosEjemplo(fincaId)) : datos.vuelosDron(fincaId)),
    [fincaId],
  );
  const [elegido, setElegido] = useState(0);
  const [vista, setVista] = useState<Vista>('salud');
  const [parcela, setParcela] = useState<[number, number] | null>(null);
  // Correccion - Poll: en el celular el mapa 3D deja parcelas de unos 25 x 12 px; en pantallas chicas abre en "Plano".
  const [modo, setModoEstado] = useState<Modo>(() => leer<Modo>(CLAVE_MODO, window.matchMedia('(max-width: 480px)').matches ? 'plano' : '3d'));
  const setModo = (m: Modo) => { setModoEstado(m); guardar(CLAVE_MODO, m); };

  const propias = fincas.datos ?? [];
  // Correccion - Poll: en el modo demo aislado las fincas de la demo ya son las de ejemplo y salian dos veces
  // ("La Esperanza" y "La Esperanza (ejemplo)"); solo se suman con la base real.
  const ejemplos = modoRealActual() ? FINCAS_EJEMPLO : [];
  const todas = [...propias, ...ejemplos];

  // Sin finca en la URL: abrir la primera propia (o la primera de ejemplo si todavía no tiene fincas).
  useEffect(() => {
    if (!fincaId && !fincas.cargando && todas.length) navegar(`/dron/${todas[0].id}`, { replace: true });
  }, [fincaId, fincas.cargando, todas.length, navegar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar de finca o de vuelo, empezar sin parcela elegida.
  useEffect(() => setParcela(null), [fincaId, elegido]);

  if (fincas.cargando || vuelos.cargando) return <Cargando />;
  // Correccion - Poll: si fallaba la carga de fincas o vuelos decia "Registre su primera finca" o "no hay vuelos";
  // ahora muestra el error con "Intentar de nuevo".
  if (fincas.error) return <ErrorCarga mensaje={fincas.error} reintentar={fincas.recargar} />;
  if (vuelos.error) return <ErrorCarga mensaje={vuelos.error} reintentar={vuelos.recargar} />;
  if (!todas.length) {
    return (
      <Vacio icono={<Icono nombre="dron" tam={48} />} titulo={t.fincas.primero}>
        <Link to="/fincas/nueva" className="boton">{t.fincas.registrarFinca}</Link>
      </Vacio>
    );
  }

  const finca = todas.find((f) => f.id === fincaId);
  const ejemplo = esEjemplo(fincaId);
  const lista = vuelos.datos ?? [];
  const v: VueloDron | undefined = lista[elegido];
  const anterior: VueloDron | undefined = lista[elegido + 1];
  const comparable = !!(v && anterior && anterior.cuadricula.length === v.cuadricula.length && anterior.cuadricula[0]?.length === v.cuadricula[0]?.length);
  const vistaActual: Vista = comparable ? vista : 'salud';

  const elegirFinca = (id: string) => {
    setElegido(0);
    navegar(`/dron/${id}`);
  };

  const portada = (
    <section className="portada portada-ancha portada-dron">
      <img className="portada-foto" src="./imagenes/fondos/dron.jpg" alt="" aria-hidden />
      <div className="portada-texto">
        <span className="portada-sello"><Icono nombre="dron" tam={16} /> {td.titulo}{ejemplo ? ` · ${td.ejemplo}` : ''}</span>
        <h1>{finca?.nombre ?? td.esta}</h1>
        <p>
          {/* Correccion - Poll: la fecha del vuelo no decia si era vieja; ahora dice hace cuantos dias fue. */}
          {v ? td.vueloDel(fecha(v.fecha), Math.max(0, Math.round((Date.parse(hoy()) - Date.parse(v.fecha)) / 864e5))) : td.sinVuelos(finca?.nombre ?? td.esta)}
          {finca?.area_ha ? ` · ${td.hectareas(finca.area_ha)}` : ''}
        </p>
        <div className="dron-controles">
          {todas.length > 1 && (
            <label className="dron-control">
              {td.finca}
              <select value={fincaId} onChange={(e) => elegirFinca(e.target.value)}>
                {ejemplos.length > 0 && propias.length > 0 ? (
                  <>
                    <optgroup label={td.misFincas}>
                      {propias.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </optgroup>
                    <optgroup label={td.fincasEjemplo}>
                      {ejemplos.map((f) => <option key={f.id} value={f.id}>{f.nombre} ({td.ejemplo.toLowerCase()})</option>)}
                    </optgroup>
                  </>
                ) : (
                  todas.map((f) => <option key={f.id} value={f.id}>{f.nombre}{esEjemplo(f.id) ? ` (${td.ejemplo.toLowerCase()})` : ''}</option>)
                )}
              </select>
            </label>
          )}
          {lista.length > 1 && (
            <div className="dron-control">
              <span id="dron-vuelos">{td.fechaVuelo}</span>
              <div className="chips" role="radiogroup" aria-labelledby="dron-vuelos">
                {lista.map((x, i) => (
                  <button key={x.id} type="button" role="radio" aria-checked={i === elegido} className="chip" onClick={() => setElegido(i)}>
                    {fecha(x.fecha)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const avisoEjemplo = ejemplo && (
    <p className="aviso dron-aviso-ejemplo" role="note">
      <Icono nombre="pregunta" tam={20} /> {propias.length ? td.avisoEjemplo : td.avisoEjemploSinFincas}{' '}
      {!propias.length && <Link to="/fincas/nueva">{t.fincas.registrarFinca}</Link>}
    </p>
  );

  // Correccion - Poll: un vuelo sin parcelas rompia la pantalla al leer la primera fila; se trata como sin vuelo.
  if (!v || !v.cuadricula.length || !v.cuadricula[0]?.length) {
    return (
      <>
        {portada}
        {avisoEjemplo}
        <Vacio icono={<Icono nombre="dron" tam={48} />} titulo={td.sinVuelos(finca?.nombre ?? td.esta)}>
          <p>{td.sinVuelosTexto}</p>
          <button className="boton" disabled>{td.pedir}</button>
        </Vacio>
      </>
    );
  }

  const s = salud(v.ndvi_promedio);
  const tendencia = anterior ? cambio(anterior.ndvi_promedio, v.ndvi_promedio) : null;
  const celdas = v.cuadricula.length * (v.cuadricula[0]?.length ?? 0);
  const m2 = finca?.area_ha && celdas ? Math.round((finca.area_ha * 10000) / celdas / 10) * 10 : null;
  const filasN = v.cuadricula.length, colsN = v.cuadricula[0]?.length ?? 0;
  const ladoM = m2 ? Math.sqrt(m2) : 20;
  const usos = usosNoAgricolas(v.elementos, filasN, colsN);
  const zonas = zonasProteccion(v.elementos, filasN, colsN, ladoM, v.pendiente_pct);
  const usoDe = (f: number, c: number) => usos.get(clave(f, c));
  const cultivables = celdas - usos.size;
  const tipos = [...new Set((v.elementos ?? []).map((e) => e.tipo))];
  const enProteccionRio = [...zonas.entries()].filter(([k, z]) => z.por === 'rio' && !usos.has(k)).length;
  const metrosRio = [...zonas.values()].find((z) => z.por === 'rio')?.metros ?? 15;

  // Parcelas a revisar: primero las que tienen problemas, luego las de estrés.
  const revisar = v.cuadricula
    .flatMap((fila, f) => fila.map((n, c) => ({ nombre: nombreParcela(f, c), n, s: salud(n), k: clave(f, c) })))
    .filter((p) => p.s !== 'sana' && !usos.has(p.k))
    .sort((a, b) => a.n - b.n);
  const nombres = revisar.slice(0, 8).map((p) => p.nombre).join(', ') + (revisar.length > 8 ? td.mas(revisar.length - 8) : '');

  const estadoDe = (f: number, c: number): Salud | Cambio =>
    vistaActual === 'cambios' ? cambio(anterior!.cuadricula[f][c], v.cuadricula[f][c]) : salud(v.cuadricula[f][c]);
  const etiquetaDe = (f: number, c: number) => {
    const u = usoDe(f, c);
    if (u) return td.parcelaOtro(nombreParcela(f, c), u.nombre ?? td.elementos[u.tipo]);
    const e = estadoDe(f, c);
    return td.parcelaAria(nombreParcela(f, c), vistaActual === 'cambios' ? td.leyendaCambios[e as Cambio] : td.salud[e as Salud], dos(v.cuadricula[f][c], t.locale));
  };
  const tocar = (f: number, c: number) => {
    const activa = parcela?.[0] === f && parcela?.[1] === c;
    setParcela(activa ? null : [f, c]);
    // En celular el detalle queda debajo del mapa: bajar lo justo para que se vea.
    if (!activa) requestAnimationFrame(() => document.querySelector('.dron-detalle')?.scrollIntoView({
      block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    }));
  };
  const sel = parcela ? { f: parcela[0], c: parcela[1], n: v.cuadricula[parcela[0]][parcela[1]] } : null;
  const selAntes = sel && comparable ? anterior!.cuadricula[sel.f][sel.c] : null;
  const selUso = sel ? usoDe(sel.f, sel.c) : undefined;
  const selZona = sel ? zonas.get(clave(sel.f, sel.c)) : undefined;

  return (
    <>
      {portada}
      {avisoEjemplo}

      {/* Resumen en palabras */}
      <section className="dron-resumen" aria-labelledby="dron-resumen-titulo">
        <div className={`tarjeta dron-veredicto salud-${s}`}>
          <span className={`dron-veredicto-icono estado-${s}`} aria-hidden><Icono nombre={s === 'sana' ? 'hoja' : 'alertas'} tam={34} /></span>
          <div>
            {/* Correccion - Poll: decia "Sus plantas estan sanas" aunque justo debajo hubiera parcelas por revisar;
                ahora, si el promedio es sano pero hay parcelas con estres, el titulo lo dice. */}
            <h2 id="dron-resumen-titulo">{s === 'sana' && revisar.length > 0 ? td.sanaConRevisar(revisar.length) : td.resumen[s]}</h2>
            <p>{td.estresTerreno(v.area_estres_pct)}</p>
            {tendencia && tendencia !== 'igual' && (
              <p className={`dron-tendencia tendencia-${tendencia}`}>
                {tendencia === 'mejor' ? td.mejoro(fecha(anterior!.fecha)) : td.empeoro(fecha(anterior!.fecha))}
              </p>
            )}
          </div>
        </div>
        <div className="fichas dron-fichas">
          <div className="ficha">
            <span className="ficha-icono" aria-hidden><Icono nombre="hoja" tam={24} /></span>
            <span className="ficha-titulo">{td.indiceVerde}</span>
            <strong className="ficha-valor">{td.deUno(dos(v.ndvi_promedio, t.locale))}</strong>
            <span className="ficha-detalle">{td.indiceAyuda}</span>
          </div>
          <div className="ficha">
            <span className="ficha-icono" aria-hidden><Icono nombre="alertas" tam={24} /></span>
            <span className="ficha-titulo">{td.areaEstres}</span>
            <strong className="ficha-valor">{v.area_estres_pct} %</strong>
            <span className="ficha-detalle">{td.parcelasRevisar(revisar.length, cultivables)}</span>
          </div>
          <div className="ficha">
            <span className="ficha-icono" aria-hidden><Icono nombre="montana" tam={24} /></span>
            <span className="ficha-titulo">{td.pendiente}</span>
            <strong className="ficha-valor">{v.pendiente_pct} %</strong>
            {/* Correccion - Poll: "12 % — Suave" no decia que significa ni desde cuanto es fuerte. */}
            <span className="ficha-detalle">{v.pendiente_pct > 30 ? td.pendienteFuerte : td.pendienteSuave(v.pendiente_pct)}</span>
          </div>
        </div>
      </section>

      {/* Mapa por parcelas */}
      <section aria-labelledby="dron-mapa-titulo">
        <div className="titulo-seccion">
          <h2 id="dron-mapa-titulo">{td.mapa}</h2>
          <div className="dron-mapa-opciones">
          <div className="interruptor dron-vistas" role="radiogroup" aria-label={td.modoMapa}>
            {(['3d', 'plano'] as const).map((x) => (
              <button key={x} type="button" role="radio" aria-checked={modo === x} onClick={() => setModo(x)}>
                {td.modos[x]}
              </button>
            ))}
          </div>
          {comparable && (
            <div className="interruptor dron-vistas" role="radiogroup" aria-label={td.mapa}>
              {(['salud', 'cambios'] as const).map((x) => (
                <button key={x} type="button" role="radio" aria-checked={vistaActual === x} onClick={() => setVista(x)}>
                  {td.vistas[x]}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="dron-mapa-zona">
          <figure className="tarjeta dron-mapa">
            <p className="dron-mapa-ayuda">
              {vistaActual === 'cambios' ? td.cambiosDesde(fecha(anterior!.fecha)) : m2 ? td.mapaAyuda(m2) : td.mapaAyudaSinArea}
              {/* Correccion - Poll: en el celular el mapa 3D deja parcelas de unos 25 x 12 px, faciles de errar con el dedo. */}
              {modo === '3d' && <span className="dron-plano-pista"> {td.planoMejor}</span>}
            </p>
            {modo === '3d' ? (
              <>
                <MapaFinca3D
                  filas={v.cuadricula.length}
                  columnas={v.cuadricula[0].length}
                  parcela={(f, c) => {
                    const u = usoDe(f, c);
                    const proteccion = zonas.has(clave(f, c));
                    if (u) return { color: ESTILO[u.tipo].color, simbolo: ESTILO[u.tipo].simbolo, etiqueta: etiquetaDe(f, c), arboles: u.tipo === 'bosque', proteccion };
                    const e = estadoDe(f, c);
                    return { color: COLOR[e], simbolo: SIMBOLO[e], etiqueta: etiquetaDe(f, c), proteccion };
                  }}
                  elementos={v.elementos}
                  nombreFila={(f) => FILAS[f] ?? String(f + 1)}
                  elegida={parcela}
                  alElegir={tocar}
                  pendientePct={v.pendiente_pct}
                  ladoM={ladoM}
                  alturas={v.alturas}
                  semilla={v.finca_id}
                  textos={{ girarIzq: td.girarIzq, girarDer: td.girarDer, centrar: td.centrar, arrastrar: td.arrastrar, mapa: td.mapaAria, acercar: td.acercar, alejar: td.alejar, moverse: td.moverse }}
                />
                <p className="dron-relieve-nota">{v.alturas ? td.relieveMedido : td.relieveAproximado(v.pendiente_pct)}</p>
              </>
            ) : (
            <div className="dron-rejilla-scroll">
            <div
              className="dron-rejilla"
              // Fincas grandes: cada cuadro mide al menos ~30 px para poder tocarlo; el mapa se desliza de lado.
              style={{ gridTemplateColumns: `auto repeat(${colsN}, minmax(0, 1fr))`, minWidth: colsN > 12 ? colsN * 30 + 30 : undefined }}
              role="grid"
              aria-label={td.mapaAria}
            >
              <span aria-hidden style={{ gridRow: 1, gridColumn: 1 }} />
              {v.cuadricula[0].map((_, c) => <span key={`c${c}`} className="dron-eje" aria-hidden style={{ gridRow: 1, gridColumn: c + 2 }}>{c + 1}</span>)}
              {v.cuadricula.flatMap((fila, f) => [
                <span key={`f${f}`} className="dron-eje" aria-hidden style={{ gridRow: f + 2, gridColumn: 1 }}>{FILAS[f] ?? f + 1}</span>,
                ...fila.map((n, c) => {
                  const estado = estadoDe(f, c);
                  const uso = usoDe(f, c);
                  const nombre = nombreParcela(f, c);
                  const activa = sel?.f === f && sel?.c === c;
                  return (
                    <button
                      key={nombre}
                      type="button"
                      className={`dron-celda ${uso ? 'estado-otro' : `estado-${estado}`}${activa ? ' activa' : ''}${zonas.has(clave(f, c)) ? ' proteccion' : ''}`}
                      style={{ gridRow: f + 2, gridColumn: c + 2, ...(uso ? { background: ESTILO[uso.tipo].color } : {}) }}
                      aria-pressed={activa}
                      aria-label={etiquetaDe(f, c)}
                      title={dos(n, t.locale)}
                      onClick={() => tocar(f, c)}
                    >
                      {uso ? ESTILO[uso.tipo].simbolo : SIMBOLO[estado]}
                    </button>
                  );
                }),
              ])}
              {/* Ríos, caminos, agua, pozos y nacientes encima de los cuadros */}
              {!!v.elementos?.length && (
                <svg className="dron-rejilla-capa" viewBox={`0 0 ${colsN} ${filasN}`} preserveAspectRatio="none" aria-hidden
                  style={{ gridRow: `2 / span ${filasN}`, gridColumn: `2 / span ${colsN}` }}>
                  {v.elementos.map((e, i) => esLinea(e) ? (
                    <polyline key={i} points={e.puntos.map((q) => q.join(',')).join(' ')} fill="none" stroke={ESTILO[e.tipo].color}
                      strokeWidth={e.tipo === 'rio' ? 7 : e.tipo === 'camino' ? 5 : e.tipo === 'quebrada' ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  ) : esPunto(e) && (e.tipo === 'pozo' || e.tipo === 'naciente') ? (
                    <circle key={i} cx={e.en[0]} cy={e.en[1]} r={0.22} fill={ESTILO[e.tipo].color} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  ) : esArea(e) && e.tipo === 'lago' ? (
                    <polygon key={i} points={e.puntos.map((q) => q.join(',')).join(' ')} fill={ESTILO.lago.color} opacity={0.55} />
                  ) : null)}
                </svg>
              )}
            </div>
            </div>
            )}
            <figcaption className="dron-leyenda">
              {(vistaActual === 'cambios' ? (['mejor', 'igual', 'peor'] as const) : (['sana', 'estres', 'critica'] as const)).map((x) => (
                <span key={x}>
                  <i className={`dron-celda estado-${x}`} aria-hidden>{SIMBOLO[x]}</i>
                  {vistaActual === 'cambios' ? td.leyendaCambios[x as Cambio] : td.leyenda[x as Salud]}
                </span>
              ))}
              {zonas.size > 0 && (
                <span><i className="dron-celda estado-sana proteccion" aria-hidden /> {td.proteccionLeyenda}</span>
              )}
            </figcaption>
            {tipos.length > 0 && (
              <div className="dron-elementos">
                <span className="dron-elementos-titulo">{td.enLaFinca}</span>
                {tipos.map((x) => (
                  <span key={x} className="dron-elemento">
                    <i style={{ background: ESTILO[x].color }} aria-hidden>{ESTILO[x].simbolo}</i>
                    {td.elementos[x]}
                  </span>
                ))}
              </div>
            )}
          </figure>

          <aside className="dron-lateral">
            {/* Detalle de la parcela tocada */}
            <div className="tarjeta dron-detalle" aria-live="polite">
              {sel && selUso ? (
                <>
                  <h3>{td.parcela(nombreParcela(sel.f, sel.c))}</h3>
                  <p className="dron-estado">
                    <i className="dron-celda estado-otro" style={{ background: ESTILO[selUso.tipo].color }} aria-hidden>{ESTILO[selUso.tipo].simbolo}</i>
                    {selUso.nombre ?? td.elementos[selUso.tipo]}
                  </p>
                  <p>{td.noSeCultiva}</p>
                  {selZona && <p className="aviso">{td.proteccionParcela(selZona.metros)}</p>}
                </>
              ) : sel ? (
                <>
                  <h3>{td.parcela(nombreParcela(sel.f, sel.c))}</h3>
                  <p className={`dron-estado estado-${salud(sel.n)}`}>
                    <i className={`dron-celda estado-${salud(sel.n)}`} aria-hidden>{SIMBOLO[salud(sel.n)]}</i>
                    {td.salud[salud(sel.n)]} · {td.indiceVerde.toLowerCase()} {dos(sel.n, t.locale)}
                  </p>
                  {selAntes !== null && (
                    <p className="dron-detalle-antes">
                      {td.antes(dos(selAntes, t.locale), fecha(anterior!.fecha))} · {td.leyendaCambios[cambio(selAntes, sel.n)]}
                    </p>
                  )}
                  <p>{td.queHacerParcela[salud(sel.n)]}</p>
                  {selZona && <p className="aviso">{td.proteccionParcela(selZona.metros)}</p>}
                  {salud(sel.n) !== 'sana' && <Link to="/reportar-plaga" className="boton boton-secundario boton-pequeno">{td.reportar}</Link>}
                </>
              ) : (
                <p className="dron-detalle-vacio"><Icono nombre="lupa" tam={22} /> {td.toque}</p>
              )}
            </div>

            {/* Qué hacer en toda la finca */}
            <div className="tarjeta dron-que-hacer">
              <h3>{td.queHacer}</h3>
              <ul>
                {revisar.length ? <li>{td.reviseParcelas(nombres)}</li> : <li>{td.todoBien}</li>}
                {v.pendiente_pct > 30 && <li>{td.curvas}</li>}
                {enProteccionRio > 0 && <li>{td.proteccionRio(metrosRio, enProteccionRio)}</li>}
                {tipos.includes('naciente') && <li>{td.proteccionNaciente}</li>}
              </ul>
              {revisar.length > 0 && (
                <Link to="/reportar-plaga" className="boton boton-ancho">
                  <Icono nombre="plaga" tam={20} /> <Tx>{td.reportar}</Tx>
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      <details className="plegable">
        <summary>{td.comoSeMide}</summary>
        <p>{t.fondos.ndvi.texto}</p>
      </details>
    </>
  );
}
