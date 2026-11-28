import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { mensajeError } from '../../errores';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CampoArea, { formatoHa } from '../../componentes/CampoArea';
import { useAvisar, useAvisoSinGuardar, useConfirmar } from '../../componentes/Confirmar';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { useAuth } from '../../contexto/AuthContext';
import ListaSugerencias, { textoMotivo } from '../../componentes/ListaSugerencias';
import { useT } from '../../contexto/PreferenciasContext';
import { recomendarSiguiente } from '../../logica/recomendacion';
import { algolia, catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import { copiaPrivada, fecha, fuentesDeAgua, hoy, nombreCultivo, sumarDias, useCargar } from '../../utilidades';
import { FotoCultivo, Icono, Tx } from '../../componentes/Iconos';

export default function NuevaSiembra() {
  const t = useT();
  const ts = t.siembra;
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const { usuario } = useAuth();
  const fincas = useCargar(() => datos.misFincas(), [], copiaPrivada(usuario?.id, 'fincas'));
  const siembras = useCargar(() => datos.misSiembras(), [], copiaPrivada(usuario?.id, 'siembras'));
  const [fincaId, setFincaId] = useState(params.get('finca') ?? '');
  const [cultivoId, setCultivoId] = useState(params.get('cultivo') ?? '');
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [fechaSiembra, setFechaSiembra] = useState(hoy());
  const [enviando, setEnviando] = useState(false);
  const avisar = useAvisar();
  const confirmar = useConfirmar();
  // Lo que la persona eligió o escribió (la finca y el cultivo pueden venir ya puestos desde otra pantalla).
  useAvisoSinGuardar(!enviando && (areaHa !== null || cultivoId !== (params.get('cultivo') ?? '')));

  useEffect(() => {
    if (!fincaId && fincas.datos?.length) setFincaId(fincas.datos[0].id);
  }, [fincas.datos, fincaId]);

  const finca = fincas.datos?.find((f) => f.id === fincaId);
  // Lo que ya ocupan las siembras activas de esta finca y lo que queda libre para la nueva.
  const ocupado = (siembras.datos ?? []).filter((s) => s.finca_id === fincaId && s.estado === 'activa').reduce((suma, s) => suma + Number(s.area_ha), 0);
  const libre = finca ? Math.max(0, Math.round((finca.area_ha - ocupado) * 10000) / 10000) : 0;
  const aptitud = useCargar(() => (finca ? algolia.aptitudDeZona(finca.codigo_distrito) : Promise.resolve([])), [finca?.codigo_distrito]);

  // El cultivo anterior de esta finca (la siembra más reciente) define la rotación.
  const anterior = useMemo(
    () => (siembras.datos ?? []).filter((s) => s.finca_id === fincaId).sort((a, b) => b.fecha_siembra.localeCompare(a.fecha_siembra))[0],
    [siembras.datos, fincaId],
  );
  const { sugerencias, evitados } = recomendarSiguiente(aptitud.datos ?? [], { anterior: anterior?.cultivo_id });
  const cultivo = catalogo.cultivo(cultivoId);
  const advertencia = cultivo && evitados.find((e) => e.cultivo === cultivo.id);
  // Lo que la persona contó de su finca al registrarla, convertido en consejos para esta siembra.
  const consejos = finca
    ? [
        ts.consejos.suelo[finca.suelo],
        !finca.riego && fuentesDeAgua(finca).every((f) => f === 'lluvia') ? ts.consejos.soloLluvia : undefined,
      ].filter((c): c is string => !!c)
    : [];

  // Correccion - Poll: si la siembra era más grande que la finca, el navegador solo decía "el valor debe ser menor o
  // igual a 0.5", sin explicar por qué ni cómo seguir. Ahora el campo dice desde el inicio cuánto mide la finca y, si se
  // pasa, una ventana lo explica y deja cambiar el tamaño de la finca ahí mismo (el área se puede escribir en ha, m² o mz).
  // Correccion - Poll: se comparaba cada siembra con toda la finca, sin restar las siembras activas, y en una finca de
  // 1 ha se podian registrar dos siembras de 1 ha. Ahora la siembra nueva solo puede ocupar lo que queda libre.
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!cultivo || !finca) return;
    if (!areaHa) return void avisar({ titulo: t.avisos.revisarDato, texto: ts.faltaArea, tono: 'error' });
    // Correccion - Poll: se podia poner una fecha de siembra del ano 3000 y la siembra se guardaba sin confirmar;
    // ahora la fecha no puede ser futura y antes de guardar se muestra un resumen para revisarlo.
    if (fechaSiembra > hoy()) return void avisar({ titulo: t.avisos.revisarDato, texto: ts.fechaFutura, tono: 'error' });
    // Correccion - Poll: al tocar "Agrandar la finca", el cambio se guardaba enseguida, aunque despues se cancelara la
    // siembra. Ahora se anota, aparece en el resumen de la confirmacion y se guarda solo al confirmar.
    let agrandar = false;
    // Tamaño que tendría que tener la finca para que quepan las siembras activas y la nueva.
    const necesario = Math.round((ocupado + areaHa) * 10000) / 10000;
    if (areaHa > libre + 1e-9) {
      const ha = formatoHa(areaHa, t.locale);
      const haFinca = formatoHa(finca.area_ha, t.locale);
      const r = await avisar({
        titulo: ocupado > 0 ? ts.sinEspacio : ts.masGrande, tono: 'error', icono: 'finca',
        texto: ocupado > 0
          ? ts.sinEspacioTexto(ha, finca.nombre, haFinca, formatoHa(ocupado, t.locale), formatoHa(libre, t.locale))
          : ts.masGrandeTexto(ha, finca.nombre, haFinca),
        acciones: [
          { id: 'corregir', texto: ts.corregir },
          { id: 'agrandar', texto: ts.agrandar(finca.nombre, formatoHa(necesario, t.locale)), principal: true },
        ],
      });
      if (r !== 'agrandar') return;
      agrandar = true;
    }
    const cosecha = sumarDias(fechaSiembra, Math.round((cultivo.ciclo_dias_min + cultivo.ciclo_dias_max) / 2));
    const tns = t.confirmar.nuevaSiembra;
    const nombre = nombreCultivo(t, cultivo.id, cultivo.nombre);
    const ok = await confirmar({
      titulo: tns.titulo(nombre.toLowerCase()),
      texto: (
        <>
          <p><strong>{tns.resumen(formatoHa(areaHa, t.locale), finca.nombre, fecha(fechaSiembra), fecha(cosecha))}</strong></p>
          {agrandar && <p>{tns.agrandara(finca.nombre, formatoHa(necesario, t.locale))}</p>}
          <p>{tns.texto}</p>
        </>
      ),
      aceptar: tns.aceptar,
    });
    if (!ok) return;
    setEnviando(true);
    if (agrandar) {
      try {
        await datos.actualizarFinca(finca.id, { area_ha: necesario });
      } catch (err) {
        setEnviando(false);
        return void avisar({ titulo: t.avisos.noSeCambio, texto: mensajeError(t, err), tono: 'error' });
      }
    }
    try {
      const s = await datos.crearSiembra({
        finca_id: finca.id,
        cultivo_id: cultivo.id,
        area_ha: areaHa,
        fecha_siembra: fechaSiembra,
        cosecha_esperada: cosecha,
      });
      navegar(`/siembras/${s.id}`, { replace: true });
    } catch (err) {
      avisar({ titulo: t.avisos.noSeGuardo, texto: mensajeError(t, err), tono: 'error' });
      setEnviando(false);
    }
  }

  if (fincas.cargando) return <Cargando />;
  // Correccion - Poll: con un error de carga decia "Registre su primera finca" a quien si tiene; ahora muestra el error.
  if (fincas.error) return <ErrorCarga mensaje={fincas.error} reintentar={fincas.recargar} />;
  if (!fincas.datos?.length) {
    return (
      <Vacio icono={<Icono nombre="finca" tam={48} />} titulo={t.fincas.primero}>
        <Link to="/fincas/nueva" className="boton">{t.fincas.registrarFinca}</Link>
      </Vacio>
    );
  }

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{ts.nueva}</h1>
      </header>

      <label className="campo-suelto">
        {ts.finca}
        <select value={fincaId} onChange={(e) => setFincaId(e.target.value)}>
          {fincas.datos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </label>

      {!cultivo && (
        <section>
          <h2>{ts.conviene}</h2>
          {anterior && <p className="ayuda">{ts.ultimo(nombreCultivo(t, anterior.cultivo_id))}</p>}
          {aptitud.cargando ? <Cargando /> : <ListaSugerencias sugerencias={sugerencias} evitados={evitados} accion={setCultivoId} />}
          <p className="separador"><span>{ts.oOtro}</span></p>
          <label className="campo-suelto">
            {ts.cultivo}
            <select value={cultivoId} onChange={(e) => setCultivoId(e.target.value)}>
              <option value="">{ts.eligeCultivo}</option>
              {catalogo.cultivos.map((c) => <option key={c.id} value={c.id}>{nombreCultivo(t, c.id, c.nombre)}</option>)}
            </select>
          </label>
        </section>
      )}

      {cultivo && (
        <form className="formulario formulario-centrado" onSubmit={enviar}>
          <div className="elegido">
            <span className="icono-cultivo" aria-hidden><FotoCultivo id={cultivo.id} prioridad /></span>
            <strong>{nombreCultivo(t, cultivo.id, cultivo.nombre)}</strong>
            <button type="button" className="enlace" onClick={() => setCultivoId('')}>{ts.cambiar}</button>
          </div>
          {advertencia && <p className="aviso aviso-error"><Tx>{ts.noRecomienda(textoMotivo(t, advertencia.motivo))}</Tx></p>}
          {consejos.length > 0 && (
            <div className="consejo-finca">
              <strong><Icono nombre="tierra" tam={18} /> {ts.consejos.titulo}</strong>
              <ul>{consejos.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          <CampoArea
            etiqueta={ts.area}
            alCambiar={setAreaHa}
            ayuda={
              !finca ? undefined
                : ocupado > 0 ? ts.areaLibre(finca.nombre, formatoHa(finca.area_ha, t.locale), formatoHa(ocupado, t.locale), formatoHa(libre, t.locale))
                : ts.areaMax(finca.nombre, formatoHa(finca.area_ha, t.locale))
            }
          />
          <label>
            {ts.fecha}
            <input type="date" required max={hoy()} value={fechaSiembra} onChange={(e) => setFechaSiembra(e.target.value)} />
          </label>
          <p className="ayuda">{ts.cosechaAyuda(cultivo.ciclo_dias_min, cultivo.ciclo_dias_max)}</p>
          {/* Mientras cargan las siembras no se sabe cuánto espacio queda libre en la finca. */}
          <button className="boton boton-ancho" disabled={enviando || siembras.cargando}>{enviando ? t.comun.guardando : ts.guardar}</button>
        </form>
      )}
    </>
  );
}
