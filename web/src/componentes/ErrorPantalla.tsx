import { Component, type ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { Icono } from './Iconos';

// Correccion - Poll: las pantallas que se bajan aparte (dron y administracion) dejaban la app entera en blanco si su
// archivo no llegaba, por ejemplo sin senal la primera vez. Este componente atrapa ese error y muestra un aviso con
// "Intentar de nuevo"; el resto de la app (menu, otras paginas) sigue funcionando.

function AvisoPantalla() {
  const t = useT();
  return (
    <div className="aviso aviso-error" role="alert">
      <p><Icono nombre="alertas" tam={20} /> {t.errores.pantalla}</p>
      <button type="button" className="boton boton-secundario" onClick={() => window.location.reload()}>
        {t.comun.reintentar}
      </button>
    </div>
  );
}

export default class ErrorPantalla extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.error('No se pudo abrir la pantalla', error);
  }

  render() {
    return this.state.fallo ? <AvisoPantalla /> : this.props.children;
  }
}
