import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CampoArea, { formatoHa } from '../../componentes/CampoArea';
import { useAvisar, useAvisoSinGuardar } from '../../componentes/Confirmar';
import { Cargando, Vacio } from '../../componentes/Estados';
import ListaSugerencias, { textoMotivo } from '../../componentes/ListaSugerencias';
import { useT } from '../../contexto/PreferenciasContext';
import { recomendarSiguiente } from '../../logica/recomendacion';
import { algolia, catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import { fuentesDeAgua, hoy, nombreCultivo, sumarDias, useCargar } from '../../utilidades';
import { FotoCultivo, Icono, Tx } from '../../componentes/Iconos';

export default function NuevaSiembra() {
  const t = useT();
  const ts = t.siembra;
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const fincas = useCargar(() => datos.misFincas(), []);
  const siembras = useCargar(() => datos.misSiembras(), []);
  const [fincaId, setFincaId] = useState(params.get('finca') ?? '');
  const [cultivoId, setCultivoId] = useState(params.get('cultivo') ?? '');
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [fechaSiembra, setFechaSiembra] = useState(hoy());
  const [enviando, setEnviando] = useState(false);
  const avisar = useAvisar();
  // Lo que la persona eligió o escribió (la finca y el cultivo pueden venir ya puestos desde otra pantalla).
  useAvisoSinGuardar(!enviando && (areaHa !== null || cultivoId !== (params.get('cultivo') ?? '')));

  useEffect(() => {
    if (!fincaId && fincas.datos?.length) setFincaId(fincas.datos[0].id);
  }, [fincas.datos, fincaId]);

  const finca = fincas.datos?.find((f) => f.id === fincaId);
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
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!cultivo || !finca) return;
    if (!areaHa) return void avisar({ titulo: t.avisos.revisarDato, texto: ts.faltaArea, tono: 'error' });
    if (areaHa > finca.area_ha) {
      const ha = formatoHa(areaHa, t.locale);
      const r = await avisar({
        titulo: ts.masGrande, tono: 'error', icono: 'finca',
        texto: ts.masGrandeTexto(ha, finca.nombre, formatoHa(finca.area_ha, t.locale)),
        acciones: [{ id: 'corregir', texto: ts.corregir }, { id: 'agrandar', texto: ts.agrandar(finca.nombre, ha), principal: true }],
      });
      if (r !== 'agrandar') return;
      try {
        await datos.actualizarFinca(finca.id, { area_ha: areaHa });
      } catch (err) {
        return void avisar({ titulo: t.avisos.noSeCambio, texto: (err as Error).message, tono: 'error' });
      }
    }
    setEnviando(true);
    try {
      const s = await datos.crearSiembra({
        finca_id: finca.id,
        cultivo_id: cultivo.id,
        area_ha: areaHa,
        fecha_siembra: fechaSiembra,
        cosecha_esperada: sumarDias(fechaSiembra, Math.round((cultivo.ciclo_dias_min + cultivo.ciclo_dias_max) / 2)),
      });
      navegar(`/siembras/${s.id}`, { replace: true });
    } catch (err) {
      avisar({ titulo: t.avisos.noSeGuardo, texto: (err as Error).message, tono: 'error' });
      setEnviando(false);
    }
  }

  if (fincas.cargando) return <Cargando />;
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
            ayuda={finca ? ts.areaMax(finca.nombre, formatoHa(finca.area_ha, t.locale)) : undefined}
          />
          <label>
            {ts.fecha}
            <input type="date" required value={fechaSiembra} onChange={(e) => setFechaSiembra(e.target.value)} />
          </label>
          <p className="ayuda">{ts.cosechaAyuda(cultivo.ciclo_dias_min, cultivo.ciclo_dias_max)}</p>
          <button className="boton boton-ancho" disabled={enviando}>{enviando ? t.comun.guardando : ts.guardar}</button>
        </form>
      )}
    </>
  );
}
