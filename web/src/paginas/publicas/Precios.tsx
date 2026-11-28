import { FotoFranja } from '../../componentes/Iconos';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { AvisoCopia, Cargando, ErrorCarga } from '../../componentes/Estados';
import GraficoLinea from '../../componentes/GraficoLinea';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia } from '../../servicios/algolia';
import { series } from '../../servicios/supabase';
import type { RegistroPrecio } from '../../tipos';
import { colones, fecha, hoy, useCargar, porUnidad } from '../../utilidades';

// Correccion - Poll: "Bajo 6 %" no decia desde cuando; ahora dice "Bajo 6 % desde el 12-11-2026".
// Correccion - Poll: sin precio anterior decia "Se mantiene"; ahora dice que aun no hay con que comparar.
export function Tendencia({ p }: { p: RegistroPrecio }) {
  const t = useT();
  const dif = p.precio - p.precio_anterior;
  const pct = p.precio_anterior ? Math.abs(Math.round((dif / p.precio_anterior) * 100)) : 0;
  // Correccion - Poll: la fecha se partia en el guion ("desde el 12-" / "11-2026"); ahora usa guiones que no se cortan.
  const desde = p.fecha_anterior ? fecha(p.fecha_anterior).replace(/-/g, '‑') : undefined;
  const texto = { sube: t.precios.sube(pct, desde), baja: t.precios.baja(pct, desde), estable: t.precios.estable, sin_comparar: t.precios.sinComparar }[p.tendencia];
  const icono = { sube: '▲', baja: '▼', estable: '●', sin_comparar: '–' }[p.tendencia];
  return (
    <span className={`tendencia tendencia-${p.tendencia}`}>
      <span aria-hidden>{icono}</span> {texto}
    </span>
  );
}

// Correccion - Poll: el grafico de cada precio se quedaba en "Cargando" para siempre si la carga fallaba, y no se veia
// nada si habia menos de 2 precios; ahora muestra el error con "Intentar de nuevo" o avisa que falta historial.
// Correccion - Poll: en el CNP no se veia de que mercado era cada precio (productor, feria, CENADA), y el precio
// anterior no decia su fecha; ahora se ven los dos.
// Correccion - Poll: sin precio anterior mostraba "Precio anterior" igual al actual; ahora esa linea solo sale si existe.
// Correccion - Poll: un producto con su ultimo precio de hace semanas se veia igual que uno de ayer; ahora la fila dice
// la fecha de su precio cuando no es la misma de la fuente.
function FilaPrecio({ p, fechaFuente }: { p: RegistroPrecio; fechaFuente?: string }) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const historico = useCargar(() => (abierto ? series.precio(p) : Promise.resolve(null)), [abierto]);
  return (
    <li className="fila-precio">
      <button className="fila-precio-boton" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>
          <strong>{p.producto}</strong>
          <small>
            {porUnidad(t, p.unidad)}{p.fuente === 'CNP' && p.mercado ? ` · ${p.mercado}` : ''}
            {fechaFuente && p.fecha !== fechaFuente ? ` · ${t.precios.delDia(fecha(p.fecha))}` : ''}
          </small>
        </span>
        <span className="fila-precio-valor">
          <strong>{colones(p.precio)}</strong>
          <Tendencia p={p} />
        </span>
      </button>
      {abierto && (
        <div className="fila-precio-detalle">
          {historico.error ? (
            <ErrorCarga mensaje={historico.error} reintentar={historico.recargar} />
          ) : !historico.datos ? (
            <Cargando />
          ) : historico.datos.length < 2 ? (
            <p className="ayuda">{t.precios.sinHistorial}</p>
          ) : (
            <GraficoLinea puntos={historico.datos} formato={colones} etiqueta={p.producto} />
          )}
          <p className="ayuda">
            {p.mercado}
            {p.fecha_anterior && <> · {t.precios.anteriorDel(fecha(p.fecha_anterior))} {colones(p.precio_anterior)}</>}
          </p>
          {p.cultivo_id && <Link to={`/cultivo/${p.cultivo_id}`}>{t.precios.verCultivo}</Link>}
        </div>
      )}
    </li>
  );
}

/** Texto sin tildes y en minúsculas, para buscar "pina" y encontrar "Piña". */
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Correccion - Poll: la busqueda no ignoraba las tildes ("pina" no encontraba "Piña"); la fecha mostrada era la del
// primer producto de la lista y no avisaba si era vieja; y con error o sin datos decia "No encontramos ese
// producto". Ahora busca sin tildes, muestra la fecha mas reciente con aviso si es vieja, y cada caso tiene su texto.
// Correccion - Poll: el aviso de precio viejo ("Hace 14 dias: …") iba en letra chica y no decia que hacer; ahora es un
// aviso con la fecha y el consejo de confirmar con el comprador.
export default function Precios() {
  const t = useT();
  const precios = useCargar(() => algolia.precios(), [], 'tf-copia-precios');
  const [fuente, setFuente] = useState<'PIMA' | 'CNP'>('PIMA');
  const [busca, setBusca] = useState('');
  const deFuente = (precios.datos ?? []).filter((p) => p.fuente === fuente);
  const lista = deFuente.filter((p) => sinTildes(p.producto).includes(sinTildes(busca.trim())));
  const fechaFuente = deFuente.reduce<string | undefined>((max, p) => (!max || p.fecha > max ? p.fecha : max), undefined);
  // PIMA publica cada día hábil (más de 3 días ya es viejo); el CNP, cada semana y con atraso (más de 10 días).
  const diasDato = fechaFuente ? Math.floor((Date.parse(hoy()) - Date.parse(fechaFuente)) / 864e5) : 0;
  const viejo = diasDato > (fuente === 'PIMA' ? 3 : 10);

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{t.precios.titulo}</h1>
        <p>{t.precios.subtitulo}</p>
      </header>
      <FotoFranja foto="mercado" />

      <div className="interruptor" role="group">
        <button aria-pressed={fuente === 'PIMA'} onClick={() => setFuente('PIMA')}>
          {t.precios.pima}
          <small>{t.precios.diario}</small>
        </button>
        <button aria-pressed={fuente === 'CNP'} onClick={() => setFuente('CNP')}>
          {t.precios.cnp}
          <small>{t.precios.semanal}</small>
        </button>
      </div>
      <p className="ayuda">{t.precios.fuentes}</p>

      <label className="buscador">
        <span className="oculto">{t.precios.buscar}</span>
        <input type="search" placeholder={t.precios.buscar} value={busca} onChange={(e) => setBusca(e.target.value)} />
      </label>

      <AvisoCopia cuando={precios.guardadoEl} />
      {fechaFuente && <AvisoActualizado que={t.comun.precios} cuando={fechaFuente} fuente={fuente} />}
      {fechaFuente && viejo && <p className="aviso" role="note">{t.precios.viejo(diasDato, fecha(fechaFuente))}</p>}
      {precios.cargando && <Cargando />}
      {precios.error && <ErrorCarga mensaje={precios.error} reintentar={precios.recargar} />}

      <ul className="lista-precios">
        {lista.map((p) => <FilaPrecio key={p.objectID} p={p} fechaFuente={fechaFuente} />)}
      </ul>
      {!precios.cargando && !precios.error && lista.length === 0 && (
        <p>{busca.trim() && deFuente.length ? t.precios.noHayBusqueda(busca.trim(), fuente === 'PIMA' ? t.precios.pima : t.precios.cnp) : t.precios.sinPrecios}</p>
      )}
    </>
  );
}
