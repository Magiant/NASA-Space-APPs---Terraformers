// Cola de reportes hechos sin señal. Se guardan en el celular y se envían solos
// cuando vuelve la conexión.
import { datos } from '../servicios/supabase';
import { guardar, leer } from '../servicios/almacen';
import type { ReportePlaga } from '../tipos';

type ReporteEnCola = Omit<ReportePlaga, 'id' | 'usuario_id' | 'estado'>;
const CLAVE = 'tf-cola-reportes';

export const cola = {
  pendientes: (): ReporteEnCola[] => leer<ReporteEnCola[]>(CLAVE, []),

  agregar: (r: ReporteEnCola) => {
    guardar(CLAVE, [...cola.pendientes(), r]);
    window.dispatchEvent(new Event('tf-cola'));
  },

  /** Intenta enviar todo lo pendiente; lo que falle se queda en la cola. */
  enviar: async (): Promise<number> => {
    const lista = cola.pendientes();
    const quedan: ReporteEnCola[] = [];
    let enviados = 0;
    for (const r of lista) {
      try {
        await datos.reportarPlaga(r);
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
