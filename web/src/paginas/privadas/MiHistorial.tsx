import { Link } from 'react-router-dom';
import { Cargando, Vacio } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import type { ResultadoSiembra } from '../../tipos';
import { fecha, nombreCultivo, nombrePlaga, useCargar } from '../../utilidades';
import { Icono, IconoCultivo, Tx } from '../../componentes/Iconos';

const ICONO: Record<ResultadoSiembra, string> = { exitosa: '✔', regular: '◐', perdida: '✕' };
const RESULTADOS = Object.keys(ICONO) as ResultadoSiembra[];

// Correccion - Poll: con una sola unidad cosechada se muestra en singular ("1 saco", no "1 sacos").
// Correccion - Poll: dice "Cosecho 22 quintales" o "Perdio 3 sacos" segun el resultado, no solo el numero.
export default function MiHistorial() {
  const t = useT();
  const th = t.historial;
  const siembras = useCargar(() => datos.misSiembras(), []);
  const fincas = useCargar(() => datos.misFincas(), []);
  const reportes = useCargar(() => datos.misReportes(), []);

  if (siembras.cargando || fincas.cargando) return <Cargando />;
  const pasadas = (siembras.datos ?? []).filter((s) => s.estado === 'finalizada').sort((a, b) => (b.fecha_cierre ?? '').localeCompare(a.fecha_cierre ?? ''));
  const cuenta = (r: ResultadoSiembra) => pasadas.filter((s) => s.resultado === r).length;

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{th.titulo}</h1>
        <p>{th.subtitulo}</p>
      </header>

      {pasadas.length === 0 ? (
        <Vacio icono={<Icono nombre="libro" tam={48} />} titulo={th.vacio}>
          <p>{th.vacioTexto}</p>
        </Vacio>
      ) : (
        <div className="columnas">
          <div className="col-principal">
            <div className="fichas fichas-3">
              {RESULTADOS.map((r) => (
                <div key={r} className={`ficha resultado-${r}`}>
                  <span className="ficha-icono" aria-hidden>{ICONO[r]}</span>
                  <strong className="ficha-valor">{cuenta(r)}</strong>
                  <span className="ficha-titulo">{th.resultado[r]}</span>
                </div>
              ))}
            </div>

            <ol className="linea-tiempo" style={{ marginTop: 24 }}>
              {pasadas.map((s) => {
                const c = catalogo.cultivo(s.cultivo_id);
                const f = fincas.datos?.find((x) => x.id === s.finca_id);
                return (
                  <li key={s.id} className={s.resultado ? `resultado-${s.resultado}` : ''}>
                    <small>{fecha(s.fecha_siembra)} → {fecha(s.fecha_cierre)} · {f?.nombre}</small>
                    <Link to={`/siembras/${s.id}`}>
                      <strong><IconoCultivo id={s.cultivo_id} /> {nombreCultivo(t, s.cultivo_id, c?.nombre)}</strong>
                      {s.resultado && <> — <Tx>{ICONO[s.resultado]}</Tx> {th.resultado[s.resultado]}</>}
                    </Link>
                    {s.cantidad ? <p>{t.cerrar.cantidadFue(s.resultado === 'perdida', `${s.cantidad} ${(s.cantidad === 1 ? t.cerrar.unidadesUna : t.cerrar.unidades)[s.unidad ?? ''] ?? s.unidad}`)} {th.en} {s.area_ha} ha</p> : null}
                    {s.motivo && <p className="ayuda">{s.motivo}</p>}
                  </li>
                );
              })}
            </ol>
          </div>

          {(reportes.datos ?? []).length > 0 && (
            <aside className="col-lateral">
              <h2>{th.reportes}</h2>
              <ul className="lista-simple">
                {reportes.datos!.map((r) => (
                  <li key={r.id} className="tarjeta">
                    <Icono nombre="plaga" tam={18} /> <strong>{r.plaga_id ? nombrePlaga(t, r.plaga_id) : th.sinIdentificar}</strong> · {fecha(r.fecha)}
                    <br />
                    <small><Tx>{r.estado === 'confirmado' ? th.confirmado : th.pendiente}</Tx></small>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}
    </>
  );
}
