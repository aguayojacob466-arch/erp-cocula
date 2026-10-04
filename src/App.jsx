import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { RolContext } from './RolContext'
import Login from './Login'
import Ventas from './Ventas'
import Usuarios from './Usuarios'

// Vistas: Ventas 2026 (todos) y Usuarios (solo administradores).
// Los modulos Dashboard, Clientes, Productos, Pedidos, Embarques, Inventario y
// Produccion siguen en src/ pero no estan en la navegacion.

function botonNav(activo) {
  return {
    fontSize: '12px', padding: '6px 14px', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 700,
    fontFamily: 'inherit', background: activo ? '#fff' : 'transparent', color: activo ? '#0B2A5B' : '#A9C3EC'
  }
}

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
      <div style={{ background: '#0B2A5B', height: '44px', boxSizing: 'border-box', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#A9C3EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/logo.svg" alt="Jabones Ibarra" style={{ height: '28px', width: 'auto', display: 'block' }} />
          <span style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.2px' }}>Maquiladora de Cocula</span>
          {esAdmin && (
            <nav style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
              <button onClick={function () { setVista('ventas') }} style={botonNav(vista === 'ventas')}>Ventas 2026</button>
              <button onClick={function () { setVista('usuarios') }} style={botonNav(vista === 'usuarios')}>Usuarios</button>
            </nav>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{session.user.email}{esAdmin ? ' (admin)' : ''}</span>
          <button onClick={cerrarSesion} style={{ fontSize: '12px', padding: '5px 12px', border: '1px solid #A9C3EC', borderRadius: '8px', background: 'transparent', color: '#A9C3EC', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cerrar sesion
          </button>
        </div>
      </div>

      {/* Ventas se queda montada (solo se oculta) para no recargar datos ni perder la conexion en vivo. */}
      <div style={{ display: vista === 'ventas' ? 'block' : 'none' }}>
        <Ventas />
      </div>
      {esAdmin && vista === 'usuarios' && <Usuarios miId={userId} />}
    </RolContext.Provider>
  )
}

export default App
