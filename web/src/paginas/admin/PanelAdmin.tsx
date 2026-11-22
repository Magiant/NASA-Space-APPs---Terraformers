import { useAvisar, useConfirmar } from '../../componentes/Confirmar';
import { Icono, Tx } from '../../componentes/Iconos';
import { useState } from 'react';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { catalogo } from '../../servicios/algolia';
import { admin } from '../../servicios/supabase';
import type { Rol } from '../../tipos';
import { fecha, nombrePlaga, useCargar } from '../../utilidades';

type Pestana = 'resumen' | 'usuarios' | 'reportes' | 'extracciones';

function Resumen() {
  const t = useT();
  const ta = t.admin;
  const r = useCargar(() => admin.resumen(), []);
  const confirmar = useConfirmar();
  if (r.cargando) return <Cargando />;
  if (r.error) return <ErrorCarga mensaje={r.error} />;
  const d = r.datos!;
  const fichas = [
    { icono: 'usuarios', titulo: ta.usuarios, valor: d.usuarios },
    { icono: 'finca', titulo: ta.fincas, valor: d.fincas },
    { icono: 'sembrar', titulo: ta.activas, valor: d.siembrasActivas },
    { icono: 'plaga', titulo: ta.porRevisar, valor: d.reportesPendientes },
  ];
  return (
    <>
      <div className="fichas">
        {fichas.map((f) => (
          <div key={f.titulo} className="ficha">
            <span className="ficha-icono" aria-hidden><Icono nombre={f.icono} tam={24} /></span>
            <span className="ficha-titulo">{f.titulo}</span>
            <strong className="ficha-valor" style={{ fontSize: '1.8rem' }}>{f.valor}</strong>
          </div>
        ))}
      </div>
      <button
        className="boton boton-secundario"
        style={{ marginTop: 16 }}
        onClick={async () => {
          // Correccion - Poll: confirm() del navegador no aparece dentro de la app de iPhone; ahora usa la ventana propia.
          const tr = t.confirmar.reiniciar;
          if (await confirmar({ titulo: tr.titulo, texto: ta.confirmarReinicio, aceptar: tr.aceptar, tono: 'peligro' })) {
            await admin.reiniciarDemo();
            r.recargar();
          }
        }}
      >
        {ta.reiniciar}
      </button>
    </>
  );
}

function Usuarios() {
  const t = useT();
  const ta = t.admin;
  const { usuario } = useAuth();
  const lista = useCargar(() => admin.usuarios(), []);
  const confirmar = useConfirmar();
  const avisar = useAvisar();
  if (lista.cargando) return <Cargando />;
  if (lista.error) return <ErrorCarga mensaje={lista.error} />;
  return (
    <>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr><th>{ta.tabla.nombre}</th><th>{ta.tabla.correo}</th><th>{ta.tabla.zona}</th><th>{ta.tabla.rol}</th></tr>
          </thead>
          <tbody>
            {lista.datos!.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.correo}</td>
                <td>{u.codigo_distrito ? catalogo.zona(u.codigo_distrito)?.distrito ?? u.codigo_distrito : '—'}</td>
                <td>
                  <select
                    aria-label={ta.rolDe(u.nombre)}
                    value={u.rol}
                    disabled={u.id === usuario?.id}
                    onChange={async (e) => {
                      // La lista vuelve sola al rol actual (es un campo controlado); solo cambia si se confirma.
                      const rol = e.target.value as Rol;
                      const tr = t.confirmar.rol;
                      const ok = await confirmar({
                        titulo: tr.titulo(u.nombre, ta.roles[rol]),
                        texto: tr.explica[rol],
                        aceptar: tr.aceptar,
                        tono: rol === 'admin' ? 'peligro' : 'normal',
                        icono: 'usuarios',
                      });
                      if (!ok) return;
                      try {
                        await admin.cambiarRol(u.id, rol);
                        lista.recargar();
                      } catch (err) {
                        avisar({ titulo: t.avisos.noSeCambio, texto: (err as Error).message, tono: 'error' });
                      }
                    }}
                  >
                    {(Object.keys(ta.roles) as Rol[]).map((r) => <option key={r} value={r}>{ta.roles[r]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ayuda">{ta.rolesAyuda}</p>
    </>
  );
}

function Reportes() {
  const t = useT();
  const ta = t.admin;
  const lista = useCargar(() => admin.reportes(), []);
  const confirmar = useConfirmar();
  if (lista.cargando) return <Cargando />;
  if (lista.error) return <ErrorCarga mensaje={lista.error} />;
  return (
    <div className="lista-tarjetas">
      {lista.datos!.map((r) => (
        <article key={r.id} className="tarjeta">
          <p className="etiqueta"><Tx>{r.estado === 'pendiente' ? ta.pendiente : ta.confirmado}</Tx> · {fecha(r.fecha)}</p>
          <h3 className="tarjeta-h"><Icono nombre="plaga" tam={20} /> {r.plaga_id ? nombrePlaga(t, r.plaga_id) : ta.sinIdentificar(r.tipo)}</h3>
          <p>{r.sintomas || ta.sinDescripcion}</p>
          <p className="ayuda">
            {r.usuario} · {catalogo.zona(r.codigo_distrito)?.distrito} · {ta.dano}: {ta.gravedad[r.gravedad]}
            {r.con_foto ? <> · <Tx>{ta.conFoto}</Tx></> : ''}
          </p>
          {r.estado === 'pendiente' && (
            <button
              className="boton boton-pequeno"
              onClick={async () => {
                const tr = t.confirmar.reporte;
                const plaga = r.plaga_id ? nombrePlaga(t, r.plaga_id) : ta.sinIdentificar(r.tipo);
                const lugar = catalogo.zona(r.codigo_distrito)?.distrito ?? '';
                if (!(await confirmar({ titulo: tr.titulo, texto: tr.texto(plaga, lugar), aceptar: tr.aceptar, icono: 'plaga' }))) return;
                await admin.confirmarReporte(r.id);
                lista.recargar();
              }}
            >
              {ta.confirmar}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function Extracciones() {
  const t = useT();
  const ta = t.admin;
  const lista = useCargar(() => admin.extracciones(), []);
  if (lista.cargando) return <Cargando />;
  if (lista.error) return <ErrorCarga mensaje={lista.error} />;
  return (
    <div className="tabla-envoltura">
      <table className="tabla">
        <thead>
          <tr><th>{ta.ext.extractor}</th><th>{ta.ext.fecha}</th><th>{ta.ext.estado}</th><th>{ta.ext.registros}</th><th>{ta.ext.detalle}</th></tr>
        </thead>
        <tbody>
          {lista.datos!.map((e) => (
            <tr key={e.id} className={`fila-${e.estado}`}>
              <td><code>{e.extractor}</code></td>
              <td>{fecha(e.inicio)} {e.inicio.slice(11, 16)}</td>
              <td><Tx>{ta.estado[e.estado]}</Tx></td>
              <td>{e.registros.toLocaleString(t.locale)}</td>
              <td>{e.mensaje ?? `${e.duracion_s} s`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PanelAdmin() {
  const t = useT();
  const ta = t.admin;
  const [pestana, setPestana] = useState<Pestana>('resumen');
  return (
    <>
      <header className="cabecera-pagina">
        <h1>{ta.titulo}</h1>
        <p>{ta.subtitulo}</p>
      </header>
      <div className="interruptor interruptor-4" role="tablist">
        {(Object.keys(ta.pestanas) as Pestana[]).map((p) => (
          <button key={p} role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}>{ta.pestanas[p]}</button>
        ))}
      </div>
      {pestana === 'resumen' && <Resumen />}
      {pestana === 'usuarios' && <Usuarios />}
      {pestana === 'reportes' && <Reportes />}
      {pestana === 'extracciones' && <Extracciones />}
    </>
  );
}
