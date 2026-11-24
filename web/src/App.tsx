import { Icono } from './componentes/Iconos';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Cargando, Vacio } from './componentes/Estados';
import ErrorPantalla from './componentes/ErrorPantalla';
import { ConfirmarProvider } from './componentes/Confirmar';
import Plantilla from './componentes/Plantilla';
import { AuthProvider } from './contexto/AuthContext';
import { PreferenciasProvider, useT } from './contexto/PreferenciasContext';
// Correccion - Poll: toda la app (con la libreria 3D del dron y el panel de administracion) bajaba en un solo archivo de
// 656 KB, pesado con mala senal; ahora esas dos paginas, que pocos usan, se bajan solo al abrirlas.
const PanelAdmin = lazy(() => import('./paginas/admin/PanelAdmin'));
import Ingresar from './paginas/auth/Ingresar';
import Registrarse from './paginas/auth/Registrarse';
import NuevaClave from './paginas/auth/NuevaClave';
import CerrarSiembra from './paginas/privadas/CerrarSiembra';
const EscaneoDron = lazy(() => import('./paginas/privadas/EscaneoDron'));
import MiHistorial from './paginas/privadas/MiHistorial';
import MiSiembra from './paginas/privadas/MiSiembra';
import MisFincas from './paginas/privadas/MisFincas';
import NuevaFinca from './paginas/privadas/NuevaFinca';
import NuevaSiembra from './paginas/privadas/NuevaSiembra';
import ReportarPlaga from './paginas/privadas/ReportarPlaga';
import Ajustes from './paginas/publicas/Ajustes';
import Alertas from './paginas/publicas/Alertas';
import Capacitaciones from './paginas/publicas/Capacitaciones';
import Creditos from './paginas/publicas/Creditos';
import Cultivo from './paginas/publicas/Cultivo';
import Inicio from './paginas/publicas/Inicio';
import Sembrar from './paginas/publicas/Sembrar';
import Precios from './paginas/publicas/Precios';
import Zona from './paginas/publicas/Zona';
import RutaPrivada from './rutas/RutaPrivada';

// Correccion - Poll: al volver del enlace del correo, la direccion trae un momento "#access_token=..." y se veia
// "Pagina no encontrada" hasta que Supabase la limpiaba; ahora se muestra "Cargando" en ese momento.
function NoEncontrada() {
  const t = useT();
  if (window.location.hash.includes('access_token=')) return <Cargando />;
  return (
    <Vacio icono={<Icono nombre="brujula" tam={48} />} titulo={t.comun.noEncontrada}>
      <Link to="/" className="boton">{t.comun.irInicio}</Link>
    </Vacio>
  );
}

// HashRouter: en GitHub Pages las URLs quedan como /#/zona/CR30101 y recargar no da 404.
export default function App() {
  return (
    <PreferenciasProvider>
    <HashRouter>
      <AuthProvider>
        {/* Ventana de "¿Está seguro?" para toda la app (componentes/Confirmar.tsx) */}
        <ConfirmarProvider>
        <Routes>
          <Route element={<Plantilla />}>
            {/* Públicas: se usan sin cuenta */}
            <Route index element={<Inicio />} />
            <Route path="sembrar" element={<Sembrar />} />
            <Route path="zona/:codigo" element={<Zona />} />
            <Route path="cultivo/:id" element={<Cultivo />} />
            <Route path="precios" element={<Precios />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="capacitaciones" element={<Capacitaciones />} />
            <Route path="creditos" element={<Creditos />} />
            <Route path="ingresar" element={<Ingresar />} />
            <Route path="registrarse" element={<Registrarse />} />
            <Route path="nueva-clave" element={<NuevaClave />} />

            {/* Personales: piden entrar solo al abrirlas */}
            <Route element={<RutaPrivada />}>
              <Route path="mi-finca" element={<MisFincas />} />
              <Route path="fincas/nueva" element={<NuevaFinca />} />
              <Route path="siembras/nueva" element={<NuevaSiembra />} />
              <Route path="siembras/:id" element={<MiSiembra />} />
              <Route path="siembras/:id/cerrar" element={<CerrarSiembra />} />
              <Route path="reportar-plaga" element={<ReportarPlaga />} />
              <Route path="historial" element={<MiHistorial />} />
              <Route path="dron" element={<ErrorPantalla><Suspense fallback={<Cargando />}><EscaneoDron /></Suspense></ErrorPantalla>} />
              <Route path="dron/:fincaId" element={<ErrorPantalla><Suspense fallback={<Cargando />}><EscaneoDron /></Suspense></ErrorPantalla>} />
            </Route>

            {/* Administración: solo rol admin */}
            <Route element={<RutaPrivada roles={['admin']} />}>
              <Route path="admin" element={<ErrorPantalla><Suspense fallback={<Cargando />}><PanelAdmin /></Suspense></ErrorPantalla>} />
            </Route>

            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
        </ConfirmarProvider>
      </AuthProvider>
    </HashRouter>
    </PreferenciasProvider>
  );
}
