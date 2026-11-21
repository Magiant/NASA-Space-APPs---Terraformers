import { FotoFranja } from '../../componentes/Iconos';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import GraficoLinea from '../../componentes/GraficoLinea';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia } from '../../servicios/algolia';
import { series } from '../../servicios/supabase';
import type { RegistroPrecio } from '../../tipos';
import { colones, useCargar } from '../../utilidades';

export function Tendencia({ p }: { p: RegistroPrecio }) {
  const t = useT();
  const dif = p.precio - p.precio_anterior;
  const pct = p.precio_anterior ? Math.abs(Math.round((dif / p.precio_anterior) * 100)) : 0;
  const texto = { sube: t.precios.sube(pct), baja: t.precios.baja(pct), estable: t.precios.estable }[p.tendencia];
  const icono = { sube: '▲', baja: '▼', estable: '●' }[p.tendencia];
  return (
    <span className={`tendencia tendencia-${p.tendencia}`}>
      <span aria-hidden>{icono}</span> {texto}
    </span>
  );
}

function FilaPrecio({ p }: { p: RegistroPrecio }) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const historico = useCargar(() => (abierto ? series.precio(p) : Promise.resolve(null)), [abierto]);
  return (
    <li className="fila-precio">
      <button className="fila-precio-boton" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>
          <strong>{p.producto}</strong>
          <small>{p.unidad}</small>
        </span>
        <span className="fila-precio-valor">
          <strong>{colones(p.precio)}</strong>
          <Tendencia p={p} />
        </span>
      </button>
      {abierto && (
        <div className="fila-precio-detalle">
          {historico.datos ? <GraficoLinea puntos={historico.datos} formato={colones} etiqueta={p.producto} /> : <Cargando />}
          <p className="ayuda">
            {p.mercado} · {t.precios.anterior} {colones(p.precio_anterior)}
          </p>
          {p.cultivo_id && <Link to={`/cultivo/${p.cultivo_id}`}>{t.precios.verCultivo}</Link>}
        </div>
      )}
    </li>
  );
}

export default function Precios() {
  const t = useT();
  const precios = useCargar(() => algolia.precios(), []);
  const [fuente, setFuente] = useState<'PIMA' | 'CNP'>('PIMA');
  const [busca, setBusca] = useState('');
  const lista = (precios.datos ?? []).filter(
    (p) => p.fuente === fuente && p.producto.toLowerCase().includes(busca.trim().toLowerCase()),
  );
  const fechaFuente = lista[0]?.fecha;

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{t.precios.titulo}</h1>
        <p>{t.precios.subtitulo}</p>
      </header>
      <FotoFranja foto="mercado" />

      <div className="interruptor" role="tablist">
        <button role="tab" aria-selected={fuente === 'PIMA'} onClick={() => setFuente('PIMA')}>
          {t.precios.pima}
          <small>{t.precios.diario}</small>
        </button>
        <button role="tab" aria-selected={fuente === 'CNP'} onClick={() => setFuente('CNP')}>
          {t.precios.cnp}
          <small>{t.precios.semanal}</small>
        </button>
      </div>

      <label className="buscador">
        <span className="oculto">{t.precios.buscar}</span>
        <input type="search" placeholder={t.precios.buscar} value={busca} onChange={(e) => setBusca(e.target.value)} />
      </label>

      {fechaFuente && <AvisoActualizado que={t.comun.precios} cuando={fechaFuente} fuente={fuente} />}
      {precios.cargando && <Cargando />}
      {precios.error && <ErrorCarga mensaje={precios.error} reintentar={precios.recargar} />}

      <ul className="lista-precios">
        {lista.map((p) => <FilaPrecio key={p.objectID} p={p} />)}
      </ul>
      {!precios.cargando && lista.length === 0 && <p>{t.precios.noHay}</p>}
    </>
  );
}
