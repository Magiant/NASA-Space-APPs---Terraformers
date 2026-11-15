import { useEffect, useRef, type ReactNode } from 'react';
import { CREDITOS_FONDOS, type Fondo } from '../fotos/creditos-fondos';

/**
 * Sección a todo lo ancho de la pantalla con una foto de fondo que se mueve más lento que la página
 * al hacer scroll (efecto parallax). Funciona en todos los navegadores (no depende de
 * animation-timeline) y se queda quieta si el teléfono tiene activado "reducir movimiento".
 */
export default function SeccionFondo({
  foto, titulo, children, etiquetaCredito, alto = 'normal',
}: {
  foto: Fondo;
  titulo: string;
  children?: ReactNode;
  etiquetaCredito: string;
  alto?: 'normal' | 'bajo';
}) {
  const seccion = useRef<HTMLElement>(null);
  const imagen = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const s = seccion.current;
    const img = imagen.current;
    if (!s || !img || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let visible = false;
    let pendiente = 0;
    const mover = () => {
      pendiente = 0;
      const r = s.getBoundingClientRect();
      // 0 cuando la sección entra por abajo, 1 cuando sale por arriba.
      const avance = (window.innerHeight - r.top) / (window.innerHeight + r.height);
      const desplazamiento = (Math.min(Math.max(avance, 0), 1) - 0.5) * r.height * 0.35;
      img.style.transform = `translate3d(0, ${desplazamiento.toFixed(1)}px, 0)`;
    };
    const alHacerScroll = () => {
      if (visible && !pendiente) pendiente = requestAnimationFrame(mover);
    };
    // Solo se calcula mientras la sección está en pantalla.
    const observador = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) mover();
    }, { rootMargin: '100px 0px' });

    observador.observe(s);
    window.addEventListener('scroll', alHacerScroll, { passive: true });
    window.addEventListener('resize', alHacerScroll);
    return () => {
      observador.disconnect();
      window.removeEventListener('scroll', alHacerScroll);
      window.removeEventListener('resize', alHacerScroll);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, []);

  const credito = CREDITOS_FONDOS[foto];
  return (
    <section ref={seccion} className={`seccion-fondo seccion-fondo-${alto}`}>
      <img ref={imagen} className="seccion-fondo-foto" src={`./imagenes/fondos/${foto}.jpg`} alt="" aria-hidden loading="lazy" decoding="async" />
      <div className="seccion-fondo-contenido">
        <h2>{titulo}</h2>
        {children}
      </div>
      <a className="seccion-fondo-credito" href={credito.url} target="_blank" rel="noreferrer">
        {etiquetaCredito}: {credito.autor} · {credito.licencia}
      </a>
    </section>
  );
}
