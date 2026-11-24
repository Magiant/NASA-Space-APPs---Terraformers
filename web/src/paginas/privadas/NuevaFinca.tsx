import CampoArea from '../../componentes/CampoArea';
import { mensajeError } from '../../errores';
import { useAvisar, useAvisoSinGuardar } from '../../componentes/Confirmar';
import { Tx } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SelectorUbicacion from '../../componentes/SelectorUbicacion';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { datos } from '../../servicios/supabase';
import type { Finca, FuenteAgua } from '../../tipos';

export default function NuevaFinca() {
  const t = useT();
  const tn = t.nuevaFinca;
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const [nombre, setNombre] = useState('');
  const [distrito, setDistrito] = useState<string | null>(usuario?.codigo_distrito ?? null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  // Correccion - Poll: solo se podía elegir una fuente de agua ("¿y si saco agua de varias?"). Ahora se marcan todas.
  const [agua, setAgua] = useState<FuenteAgua[]>(['lluvia']);
  const [riego, setRiego] = useState(false);
  const [suelo, setSuelo] = useState<Finca['suelo']>('no_se');
  const [enviando, setEnviando] = useState(false);
  // Lo que la persona escribió (el distrito viene de su cuenta y no cuenta como cambio).
  useAvisoSinGuardar(!enviando && (!!nombre.trim() || areaHa !== null));

  const alternarAgua = (k: FuenteAgua) => setAgua((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const revisar = (texto: string) => avisar({ titulo: t.avisos.revisarDato, texto, tono: 'error' });
    if (!distrito) return void revisar(tn.eligeDistrito);
    if (!areaHa) return void revisar(tn.faltaTamano);
    if (!agua.length) return void revisar(tn.faltaAgua);
    setEnviando(true);
    try {
      // fuente_agua: la principal (la primera marcada), para las versiones de la app que solo conocen una.
      const f = await datos.crearFinca({
        nombre: nombre.trim(), codigo_distrito: distrito, area_ha: areaHa,
        fuente_agua: agua[0], fuentes_agua: agua, riego, suelo,
      });
      navegar(`/siembras/nueva?finca=${f.id}`, { replace: true });
    } catch (err) {
      avisar({ titulo: t.avisos.noSeGuardo, texto: mensajeError(t, err), tono: 'error' });
      setEnviando(false);
    }
  }

  return (
    <section className="formulario-centrado">
      <h1>{tn.titulo}</h1>
      <p className="ayuda"><Tx>{tn.privado}</Tx></p>
      <form className="formulario" onSubmit={enviar}>
        <label>
          {tn.nombre}
          <input required maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tn.ejemplo} />
        </label>
        <fieldset>
          <legend>{tn.donde}</legend>
          <SelectorUbicacion valor={distrito} alCambiar={setDistrito} conGps />
        </fieldset>
        <CampoArea etiqueta={tn.tamano} alCambiar={setAreaHa} ayuda={tn.tamanoAyuda} />
        <fieldset>
          <legend>{tn.aguaPregunta}</legend>
          <p className="ayuda">{tn.aguaAyuda}</p>
          <div className="chips" role="group" aria-label={tn.aguaPregunta}>
            {(Object.keys(tn.aguaOpciones) as FuenteAgua[]).map((k) => (
              <button type="button" key={k} role="checkbox" aria-checked={agua.includes(k)} className="chip" onClick={() => alternarAgua(k)}>
                {tn.aguaOpciones[k]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="opciones-grandes">
          <legend>{tn.riego}</legend>
          <label><input type="radio" name="riego" checked={riego} onChange={() => setRiego(true)} /> {tn.si}</label>
          <label><input type="radio" name="riego" checked={!riego} onChange={() => setRiego(false)} /> {tn.no}</label>
        </fieldset>
        <label>
          {tn.suelo}
          <select value={suelo} onChange={(e) => setSuelo(e.target.value as Finca['suelo'])}>
            {(Object.keys(tn.suelos) as Finca['suelo'][]).map((k) => <option key={k} value={k}>{tn.suelos[k]}</option>)}
          </select>
          <small className="ayuda">{tn.sueloAyuda}</small>
        </label>
        <button className="boton boton-ancho" disabled={enviando}>{enviando ? t.comun.guardando : tn.guardar}</button>
      </form>
    </section>
  );
}
