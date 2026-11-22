import { FotoPlaga, Icono, NombreIcono, Tx } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAvisar, useAvisoSinGuardar } from '../../componentes/Confirmar';
import { Cargando } from '../../componentes/Estados';
import ListaSugerencias from '../../componentes/ListaSugerencias';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { recomendarSiguiente } from '../../logica/recomendacion';
import { cola } from '../../offline/cola';
import { algolia, catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import type { Gravedad, RegistroPlaga, TipoPlaga } from '../../tipos';
import { hoy, nombreCultivo, nombrePlaga, useCargar, useEnLinea } from '../../utilidades';

const TIPOS: { valor: TipoPlaga | 'no_se'; icono: NombreIcono }[] = [
  { valor: 'insecto', icono: 'plaga' },
  { valor: 'hongo', icono: 'hongo' },
  { valor: 'virus', icono: 'adn' },
  { valor: 'nematodo', icono: 'gusano' },
  { valor: 'maleza', icono: 'maleza' },
  { valor: 'no_se', icono: 'pregunta' },
];

const GRAVEDADES: Gravedad[] = ['leve', 'moderada', 'grave'];

function Resultado({ plaga, distrito, anterior, enCola }: { plaga: RegistroPlaga | undefined; distrito: string; anterior: string | null; enCola: boolean }) {
  const t = useT();
  const tp = t.plaga;
  const aptitud = useCargar(() => algolia.aptitudDeZona(distrito), [distrito]);
  const { sugerencias, evitados } = recomendarSiguiente(aptitud.datos ?? [], { anterior, plagaId: plaga?.id });

  return (
    <>
      <div className="aviso aviso-ok" role="status"><Tx>{enCola ? tp.enCola : tp.enviado}</Tx></div>

      {plaga ? (
        <>
          <h2>{tp.comoControlar(nombrePlaga(t, plaga.id, plaga.nombre).toLowerCase())}</h2>
          <FotoPlaga id={plaga.id} etiqueta={t.cultivo.foto} />
          <p>{plaga.sintomas}</p>
          <ol className="pasos-control">
            <li>
              <strong>{tp.paso1}</strong>
              <ul>{plaga.control.cultural.map((x) => <li key={x}>{x}</li>)}</ul>
            </li>
            <li>
              <strong>{tp.paso2}</strong>
              <ul>{plaga.control.biologico.map((x) => <li key={x}>{x}</li>)}</ul>
            </li>
            <li>
              <strong>{tp.paso3}</strong>
              <ul>{plaga.control.quimico.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="ayuda">{tp.sfe}</p>
            </li>
          </ol>
        </>
      ) : (
        <p>{tp.sinIdentificar}</p>
      )}

      <h2>{tp.proxima}</h2>
      <p className="ayuda">{tp.proximaAyuda}</p>
      {aptitud.cargando ? <Cargando /> : <ListaSugerencias sugerencias={sugerencias} evitados={evitados} />}

      <div className="acciones" style={{ maxWidth: 560 }}>
        <Link to="/capacitaciones" className="boton boton-secundario"><Tx>{tp.cursos}</Tx></Link>
        <Link to="/mi-finca" className="boton">{tp.volverFincas}</Link>
      </div>
    </>
  );
}

export default function ReportarPlaga() {
  const t = useT();
  const tp = t.plaga;
  const [params] = useSearchParams();
  const enLinea = useEnLinea();
  const fincas = useCargar(() => datos.misFincas(), []);
  const siembras = useCargar(() => datos.misSiembras(), []);
  const [siembraId, setSiembraId] = useState(params.get('siembra') ?? '');
  const [tipo, setTipo] = useState<TipoPlaga | 'no_se' | null>(null);
  const [plagaId, setPlagaId] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [gravedad, setGravedad] = useState<Gravedad>('moderada');
  const [foto, setFoto] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<{ enCola: boolean } | null>(null);
  const avisar = useAvisar();
  const { usuario } = useAuth();
  // Reporte empezado y sin enviar: avisar antes de salir.
  useAvisoSinGuardar(!enviado && (!!tipo || !!plagaId || !!sintomas.trim() || !!foto));

  if (fincas.cargando || siembras.cargando) return <Cargando />;
  const activas = (siembras.datos ?? []).filter((s) => s.estado === 'activa');
  const siembra = activas.find((s) => s.id === siembraId);
  const finca = fincas.datos?.find((f) => f.id === siembra?.finca_id) ?? fincas.datos?.[0];
  const posibles = catalogo.plagas.filter((p) => (!tipo || tipo === 'no_se' || p.tipo === tipo) && (!siembra || p.cultivos.includes(siembra.cultivo_id)));

  if (!finca) {
    return (
      <section className="vacio">
        <h1>{t.fincas.primero}</h1>
        <Link to="/fincas/nueva" className="boton">{t.fincas.registrarFinca}</Link>
      </section>
    );
  }

  if (enviado) {
    return (
      <>
        <header className="cabecera-pagina"><h1>{tp.reporte}</h1></header>
        <Resultado plaga={catalogo.plaga(plagaId)} distrito={finca.codigo_distrito} anterior={siembra?.cultivo_id ?? null} enCola={enviado.enCola} />
      </>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!tipo) return void avisar({ titulo: t.avisos.revisarDato, texto: tp.eligeTipo, tono: 'error' });
    const reporte = {
      siembra_id: siembra?.id ?? null,
      codigo_distrito: finca!.codigo_distrito,
      tipo, plaga_id: plagaId || null, sintomas: sintomas.trim(), gravedad,
      con_foto: !!foto, fecha: hoy(),
    };
    // En la cola queda de quién es el reporte, para no enviarlo con otra cuenta (offline/cola.ts).
    if (!enLinea) {
      cola.agregar(reporte, usuario!.id);
      return setEnviado({ enCola: true });
    }
    try {
      await datos.reportarPlaga(reporte);
      setEnviado({ enCola: false });
    } catch {
      cola.agregar(reporte, usuario!.id);
      setEnviado({ enCola: true });
    }
  }

  return (
    <section className="formulario-centrado">
      <h1>{tp.titulo}</h1>
      <p>{tp.subtitulo} {!enLinea && tp.sinSenal}</p>

      <form className="formulario" onSubmit={enviar}>
        <label>
          {tp.enQue}
          <select value={siembraId} onChange={(e) => { setSiembraId(e.target.value); setPlagaId(''); }}>
            <option value="">{tp.ninguna}</option>
            {activas.map((s) => (
              <option key={s.id} value={s.id}>
                {nombreCultivo(t, s.cultivo_id)} — {fincas.datos?.find((f) => f.id === s.finca_id)?.nombre}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>{tp.tipoDano}</legend>
          <div className="opciones-cara" role="radiogroup">
            {TIPOS.map((x) => (
              <button type="button" key={x.valor} role="radio" aria-checked={tipo === x.valor} onClick={() => { setTipo(x.valor); setPlagaId(''); }}>
                <span aria-hidden><Icono nombre={x.icono} tam={36} /></span>
                {tp.tipos[x.valor]}
              </button>
            ))}
          </div>
        </fieldset>

        {tipo && posibles.length > 0 && (
          <label>
            {tp.sabeCual}
            <select value={plagaId} onChange={(e) => setPlagaId(e.target.value)}>
              <option value="">{tp.noSeguro}</option>
              {posibles.map((p) => <option key={p.id} value={p.id}>{nombrePlaga(t, p.id, p.nombre)}</option>)}
            </select>
            {plagaId && <small className="ayuda">{catalogo.plaga(plagaId)?.sintomas}</small>}
          </label>
        )}
        {tipo && plagaId && (
          <FotoPlaga key={plagaId} id={plagaId} etiqueta={t.cultivo.foto} />
        )}

        <label>
          {tp.queVe}
          <textarea rows={3} maxLength={1000} value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder={tp.queVeEjemplo} />
        </label>

        <fieldset>
          <legend>{tp.cuanto}</legend>
          <div className="chips" role="radiogroup">
            {GRAVEDADES.map((g) => (
              <button type="button" key={g} role="radio" aria-checked={gravedad === g} className="chip" onClick={() => setGravedad(g)}>
                {tp.gravedad[g]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="subir-foto">
          <Icono nombre="camara" tam={22} /> {foto ? tp.cambiarFoto : tp.foto}
          <input
            type="file" accept="image/*" capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFoto(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        {foto && <img src={foto} alt={tp.fotoAlt} className="vista-foto" />}

        <button className="boton boton-ancho">{enLinea ? tp.enviar : tp.guardarDespues}</button>
      </form>
    </section>
  );
}
