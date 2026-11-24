// Cola de reportes hechos sin señal. Se guardan en el celular y se envían solos
// cuando vuelve la conexión.
//
// Cada reporte recuerda de qué cuenta es (`dueno`). Si en el mismo teléfono se cierra sesión y entra otra
// persona, los reportes de la primera NO se envían con el nombre de la segunda: esperan a que vuelva su dueño.
import { datos } from '../servicios/supabase';
import { guardar, leer } from '../servicios/almacen';
import type { ReportePlaga } from '../tipos';

type Reporte = Omit<ReportePlaga, 'id' | 'usuario_id' | 'estado'>;
type ReporteEnCola = Reporte & { dueno?: string; fallos?: number };
const CLAVE = 'tf-cola-reportes';
const MAX_FALLOS = 5;
/** Reportes que el servidor rechazó varias veces: se guardan aquí para no perderlos. */
const CLAVE_RECHAZADOS = 'tf-cola-rechazados';

const todos = () => leer<ReporteEnCola[]>(CLAVE, []);
/** Los reportes viejos (de antes de guardar el dueño) cuentan para quien tenga la sesión abierta. */
const esDe = (r: ReporteEnCola, dueno: string) => !r.dueno || r.dueno === dueno;

export const cola = {
  /** Reportes sin enviar de esa cuenta (sin cuenta: ninguno). */
  pendientes: (dueno?: string | null): ReporteEnCola[] => (dueno ? todos().filter((r) => esDe(r, dueno)) : []),

  agregar: (r: Reporte, dueno: string) => {
    guardar(CLAVE, [...todos(), { ...r, dueno }]);
    window.dispatchEvent(new Event('tf-cola'));
  },

  // Correccion - Poll: antes se enviaba toda la cola con la sesion que estuviera abierta, asi que si otra persona
  // entraba en el mismo telefono, los reportes pendientes salian a su nombre. Ahora solo se envian los del dueño.
  /** Intenta enviar lo pendiente de esa cuenta; lo que falle (o sea de otra cuenta) se queda en la cola. */
  enviar: async (dueno: string): Promise<{ enviados: number; rechazados: number }> => {
    const quedan: ReporteEnCola[] = [];
    let enviados = 0;
    let rechazados = 0;
    for (const r of todos()) {
      if (!esDe(r, dueno)) {
        quedan.push(r);
        continue;
      }
      const { dueno: _dueno, fallos = 0, ...reporte } = r; // `dueno` y `fallos` son solo del teléfono: no van a la base
      try {
        await datos.reportarPlaga(reporte);
        enviados++;
      } catch (e) {
        // Correccion - Poll: un reporte que el servidor rechazaba (no por falta de senal) se reintentaba para siempre
        // en cada vuelta de la senal. Ahora la falta de senal no cuenta, y tras 5 rechazos del servidor se deja.
        const sinSenal = (e as { codigo?: string }).codigo === 'sin_conexion' || !navigator.onLine;
        if (sinSenal || fallos + 1 < MAX_FALLOS) quedan.push({ ...r, fallos: sinSenal ? fallos : fallos + 1 });
        else {
          // Correccion - Poll: tras 5 rechazos el reporte se borraba sin avisar; ahora se guarda aparte y se avisa.
          console.error('Reporte rechazado varias veces por el servidor', reporte, e);
          guardar(CLAVE_RECHAZADOS, [...leer<ReporteEnCola[]>(CLAVE_RECHAZADOS, []), r]);
          rechazados++;
        }
      }
    }
    guardar(CLAVE, quedan);
    if (enviados) window.dispatchEvent(new Event('tf-cola'));
    return { enviados, rechazados };
  },
};
