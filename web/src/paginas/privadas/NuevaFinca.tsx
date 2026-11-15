import { Tx } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SelectorUbicacion from '../../componentes/SelectorUbicacion';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { datos } from '../../servicios/supabase';
import type { Finca } from '../../tipos';

export default function NuevaFinca() {
  const t = useT();
  const tn = t.nuevaFinca;
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [nombre, setNombre] = useState('');
  const [distrito, setDistrito] = useState<string | null>(usuario?.codigo_distrito ?? null);
  const [area, setArea] = useState('');
  const [agua, setAgua] = useState<Finca['fuente_agua']>('lluvia');
  const [riego, setRiego] = useState(false);
  const [suelo, setSuelo] = useState<Finca['suelo']>('no_se');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!distrito) return setError(tn.eligeDistrito);
    setEnviando(true);
    try {
      const f = await datos.crearFinca({ nombre: nombre.trim(), codigo_distrito: distrito, area_ha: Number(area), fuente_agua: agua, riego, suelo });
      navegar(`/siembras/nueva?finca=${f.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
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
        <label>
          {tn.tamano}
          <input type="number" inputMode="decimal" min="0.01" step="0.01" required value={area} onChange={(e) => setArea(e.target.value)} />
          <small className="ayuda">{tn.tamanoAyuda}</small>
        </label>
        <label>
          {tn.aguaPregunta}
          <select value={agua} onChange={(e) => setAgua(e.target.value as Finca['fuente_agua'])}>
            {(Object.keys(tn.aguaOpciones) as Finca['fuente_agua'][]).map((k) => <option key={k} value={k}>{tn.aguaOpciones[k]}</option>)}
          </select>
        </label>
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
        </label>
        {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        <button className="boton boton-ancho" disabled={enviando}>{enviando ? t.comun.guardando : tn.guardar}</button>
      </form>
    </section>
  );
}
