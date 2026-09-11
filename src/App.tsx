import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Spinner } from './components/ui'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Jugadores from './pages/Jugadores'
import Cuotas from './pages/Cuotas'
import Caja from './pages/Caja'
import CuotasLiga from './pages/CuotasLiga'
import Temporadas from './pages/Temporadas'
import Premios from './pages/Premios'
import Partidos from './pages/Partidos'
import Cartas from './pages/Cartas'
import Formaciones from './pages/Formaciones'
import Reglamento from './pages/Reglamento'
import JugadorArea from './pages/jugador/JugadorArea'
import Votaciones from './pages/Votaciones'
import Encuestas from './pages/Encuestas'
import Estadisticas from './pages/Estadisticas'
import Configuracion from './pages/Configuracion'
import Certificados from './pages/Certificados'
import { Importar } from './pages/modulos'

/** La raíz no es una página: es el cruce que manda a cada uno a lo suyo. */
function Inicio() {
  const { session, loading, perfilListo, esDirectiva } = useAuth()
  if (loading || (session && !perfilListo)) return <Spinner />
  // Sin sesión, a la zona de jugadores: ahí entran 25 de las 26 cuentas, y
  // la directiva llega igual porque desde su login se la redirige.
  if (!session) return <Navigate to="/jugadores" replace />
  return <Navigate to={esDirectiva ? '/panel' : '/jugadores'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* La web pública vive en la app `sitio/`. Acá la raíz manda a cada uno
          a lo suyo: la directiva a la herramienta y el plantel a su carta. */}
      <Route path="/" element={<Inicio />} />
      {/* Área de los 25 jugadores (celular). Ojo: este path lo tienen ellos, no cambiarlo. */}
      <Route path="/jugadores" element={<JugadorArea />} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/reglamento" element={<Reglamento />} />
        {/* Deportivo */}
        <Route path="/temporadas" element={<Temporadas />} />
        <Route path="/partidos" element={<Partidos />} />
        <Route path="/votaciones" element={<Votaciones />} />
        <Route path="/encuestas" element={<Encuestas />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/plantel" element={<Jugadores />} />
        <Route path="/cartas" element={<Cartas />} />
        <Route path="/formacion" element={<Formaciones />} />
        <Route path="/premios" element={<Premios />} />
        <Route path="/certificados" element={<Certificados />} />
        {/* Administración */}
        <Route path="/cuotas" element={<Cuotas />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/cuotas-liga" element={<CuotasLiga />} />
        <Route path="/importar" element={<Importar />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/jugadores" replace />} />
    </Routes>
  )
}
