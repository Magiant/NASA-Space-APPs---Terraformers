import { Icono } from './Iconos';
import { useT } from '../contexto/PreferenciasContext';

/**
 * Descarga de la app de Android. El APK lo compila y publica GitHub Actions (.github/workflows/android.yml)
 * en cada cambio de main, siempre en la misma dirección, así este enlace no cambia.
 */
export const URL_APK = 'https://github.com/Magiant/NASA-Space-APPs---Terraformers/releases/download/app-android/TerraFarm.apk';

/**
 * Se ofrece en teléfonos Android y en computadoras (para pasarla al teléfono), pero no dentro de las
 * apps (ya la tienen) ni en iPhone/iPad, donde un APK no sirve.
 */
export function mostrarDescargaApk(): boolean {
  if (typeof document === 'undefined' || document.documentElement.dataset.nativo) return false;
  const ua = navigator.userAgent;
  const ipad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPadOS se presenta como Mac
  return !/iPhone|iPad|iPod/i.test(ua) && !ipad;
}

/** Tarjeta grande para la página de Inicio. */
export function TarjetaDescargaApp() {
  const t = useT();
  if (!mostrarDescargaApk()) return null;
  return (
    <section className="tarjeta descarga-app" aria-labelledby="titulo-app">
      <span className="descarga-app-icono" aria-hidden><Icono nombre="celular" tam={34} /></span>
      <div className="descarga-app-texto">
        <h2 id="titulo-app">{t.app.titulo}</h2>
        <p>{t.app.texto}</p>
        <a className="boton" href={URL_APK} download>
          <Icono nombre="descargar" tam={20} /> {t.app.boton}
        </a>
        <p className="descarga-app-ayuda">{t.app.ayuda}</p>
      </div>
    </section>
  );
}

/** Enlace corto para el pie de página. */
export function EnlaceDescargaApp() {
  const t = useT();
  if (!mostrarDescargaApk()) return null;
  return (
    <a className="pie-descarga" href={URL_APK} download>
      <Icono nombre="descargar" tam={18} /> {t.app.pie}
    </a>
  );
}
