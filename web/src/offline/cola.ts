// Cola de reportes hechos sin señal. Se guardan en el celular y se envían solos
// cuando vuelve la conexión.
//
// Cada reporte recuerda de qué cuenta es (`dueno`). Si en el mismo teléfono se cierra sesión y entra otra
// persona, los reportes de la primera NO se envían con el nombre de la segunda: esperan a que vuelva su dueño.
import { datos } from '../servicios/supabase';
import { guardar, leer } from '../servicios/almacen';
import type { ReportePlaga } from '../tipos';

type Reporte = Omit<ReportePlaga, 'id' | 'usuario_id' | 'estado'>;
type ReporteEnCola = Reporte & { dueno?: string };
const CLAVE = 'tf-cola-reportes';

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
  enviar: async (dueno: string): Promise<number> => {
    const quedan: ReporteEnCola[] = [];
    let enviados = 0;
    for (const r of todos()) {
      if (!esDe(r, dueno)) {
        quedan.push(r);
        continue;
      }
      const { dueno: _dueno, ...reporte } = r; // `dueno` es solo del teléfono: no va a la base
      try {
        await datos.reportarPlaga(reporte);
        enviados++;
      } catch {
        quedan.push(r);
      }
    }
    guardar(CLAVE, quedan);
    if (enviados) window.dispatchEvent(new Event('tf-cola'));
    return enviados;
  },
};
