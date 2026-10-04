import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { RolContext } from './RolContext'
import Login from './Login'
import Ventas from './Ventas'
import Usuarios from './Usuarios'

// Vistas: Ventas 2026 (todos) y Usuarios (solo administradores).
// Los modulos Dashboard, Clientes, Productos, Pedidos, Embarques, Inventario y
// Produccion siguen en src/ pero no estan en la navegacion.

function App() {
  const [session, setSession] = useState(undefined) // undefined = aun comprobando
  const [rol, setRol] = useState(null)
  const [vista, setVista] = useState('ventas')

  useEffect(function () {
    supabase.auth.getSession().then(function (resp) {
      setSession(resp.data.session)
    })
    const sub = supabase.auth.onAuthStateChange(function (_evento, nuevaSesion) {
      setSession(nuevaSesion)
    })
    return function () { sub.data.subscription.unsubscribe() }
  }, [])

  const userId = session ? session.user.id : null

  useEffect(function () {
    if (!userId) return
    let activo = true
    supabase.from('perfiles').select('rol').eq('id', userId).maybeSingle().then(function (resp) {
      if (activo) setRol(resp.data ? resp.data.rol : 'usuario')
    })
    return function () { activo = false }
  }, [userId])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setRol(null)
    setVista('ventas')
  }

  if (session === undefined) {
    return <p style={{ padding: '2rem' }}>Cargando...</p>
  }

  if (!session) {
    return <Login />
  }

  if (rol === null) {
    return <p style={{ padding: '2rem' }}>Cargando...</p>
  }

  const esAdmin = rol === 'admin'

  return (
    <RolContext.Provider value={{ esAdmin: esAdmin }}>
      <div className="erp-app">
        <header className="erp-bar">
          <div className="erp-marca">
            <img className="erp-logo" src="/logo.svg" alt="Jabones Ibarra" />
            <span className="erp-nombre">Maquiladora de Cocula</span>
          </div>
          {esAdmin && (
            <nav className="erp-nav" aria-label="Secciones">
              <button className={vista === 'ventas' ? 'activo' : ''} onClick={function () { setVista('ventas') }}>Ventas 2026</button>
              <button className={vista === 'usuarios' ? 'activo' : ''} onClick={function () { setVista('usuarios') }}>Usuarios</button>
            </nav>
          )}
          <div className="erp-usuario">
            <span className="erp-email">{session.user.email}{esAdmin ? ' (admin)' : ''}</span>
            <button className="erp-salir" onClick={cerrarSesion}>Cerrar sesion</button>
          </div>
        </header>

        <main className="erp-contenido">
          {/* Ventas se queda montada (solo se oculta) para no recargar datos ni perder la conexion en vivo. */}
          <div className="erp-vista-ventas" style={{ display: vista === 'ventas' ? 'block' : 'none' }}>
            <Ventas />
          </div>
          {esAdmin && vista === 'usuarios' && <Usuarios miId={userId} />}
        </main>
      </div>
    </RolContext.Provider>
  )
}

export default App
