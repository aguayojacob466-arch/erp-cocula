import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { RolContext } from './RolContext'
import Login from './Login'
import Ventas from './Ventas'

// Solo se muestra Ventas 2026. Los modulos Dashboard, Clientes, Productos,
// Pedidos, Embarques, Inventario y Produccion siguen en src/ pero no estan
// en la navegacion; para volver a mostrarlos hay que importarlos aqui.

function App() {
  const [session, setSession] = useState(undefined) // undefined = aun comprobando
  const [rol, setRol] = useState(null)

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

  return (
    <RolContext.Provider value={{ esAdmin: rol === 'admin' }}>
      <div style={{ background: '#0B2A5B', height: '44px', boxSizing: 'border-box', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#A9C3EC' }}>
        <span style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.2px' }}>Maquiladora de Cocula</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{session.user.email}{rol === 'admin' ? ' (admin)' : ''}</span>
          <button onClick={cerrarSesion} style={{ fontSize: '12px', padding: '5px 12px', border: '1px solid #A9C3EC', borderRadius: '8px', background: 'transparent', color: '#A9C3EC', cursor: 'pointer' }}>
            Cerrar sesion
          </button>
        </div>
      </div>

      <Ventas />
    </RolContext.Provider>
  )
}

export default App
