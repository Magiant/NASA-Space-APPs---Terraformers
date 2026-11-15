import { Icono } from './componentes/Iconos';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Vacio } from './componentes/Estados';
import Plantilla from './componentes/Plantilla';
import { AuthProvider } from './contexto/AuthContext';
import { PreferenciasProvider, useT } from './contexto/PreferenciasContext';
import PanelAdmin from './paginas/admin/PanelAdmin';
import Ingresar from './paginas/auth/Ingresar';
import Registrarse from './paginas/auth/Registrarse';
import CerrarSiembra from './paginas/privadas/CerrarSiembra';
import EscaneoDron from './paginas/privadas/EscaneoDron';
import MiHistorial from './paginas/privadas/MiHistorial';
import MiSiembra from './paginas/privadas/MiSiembra';
import MisFincas from './paginas/privadas/MisFincas';
import NuevaFinca from './paginas/privadas/NuevaFinca';
import NuevaSiembra from './paginas/privadas/NuevaSiembra';
import ReportarPlaga from './paginas/privadas/ReportarPlaga';
import Alertas from './paginas/publicas/Alertas';
import Capacitaciones from './paginas/publicas/Capacitaciones';
import Cultivo from './paginas/publicas/Cultivo';
import Inicio from './paginas/publicas/Inicio';
import Precios from './paginas/publicas/Precios';
import Zona from './paginas/publicas/Zona';
import RutaPrivada from './rutas/RutaPrivada';

function NoEncontrada() {
  const t = useT();
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
        <Routes>
          <Route element={<Plantilla />}>
            {/* Públicas: se usan sin cuenta */}
            <Route index element={<Inicio />} />
            <Route path="zona/:codigo" element={<Zona />} />
            <Route path="cultivo/:id" element={<Cultivo />} />
            <Route path="precios" element={<Precios />} />
            <Route path="alertas" element={<Alertas />} />
            <Route path="capacitaciones" element={<Capacitaciones />} />
            <Route path="ingresar" element={<Ingresar />} />
            <Route path="registrarse" element={<Registrarse />} />

            {/* Personales: piden entrar solo al abrirlas */}
            <Route element={<RutaPrivada />}>
              <Route path="mi-finca" element={<MisFincas />} />
              <Route path="fincas/nueva" element={<NuevaFinca />} />
              <Route path="siembras/nueva" element={<NuevaSiembra />} />
              <Route path="siembras/:id" element={<MiSiembra />} />
              <Route path="siembras/:id/cerrar" element={<CerrarSiembra />} />
              <Route path="reportar-plaga" element={<ReportarPlaga />} />
              <Route path="historial" element={<MiHistorial />} />
              <Route path="dron" element={<EscaneoDron />} />
              <Route path="dron/:fincaId" element={<EscaneoDron />} />
            </Route>

            {/* Administración: solo rol admin */}
            <Route element={<RutaPrivada roles={['admin']} />}>
              <Route path="admin" element={<PanelAdmin />} />
            </Route>

            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
    </PreferenciasProvider>
  );
}
