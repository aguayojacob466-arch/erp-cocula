import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { RolContext } from './RolContext'
import Login from './Login'
import Dashboard from './Dashboard'
import Clientes from './Clientes'
import Pedidos from './Pedidos'
import Productos from './Productos'
import Embarques from './Embarques'
import Inventario from './Inventario'
import Produccion from './Produccion'
import Ventas from './Ventas'

const VISTAS = [
  { id: 'ventas', label: 'Ventas 2026', Componente: Ventas },
  { id: 'dashboard', label: 'Dashboard', Componente: Dashboard },
  { id: 'clientes', label: 'Clientes', Componente: Clientes },
  { id: 'productos', label: 'Productos', Componente: Productos },
  { id: 'pedidos', label: 'Pedidos', Componente: Pedidos },
  { id: 'embarques', label: 'Embarques', Componente: Embarques },
  { id: 'inventario', label: 'Inventario', Componente: Inventario },
  { id: 'produccion', label: 'Produccion', Componente: Produccion },
]

function botonEstilo(activo) {
  return {
    fontSize: '12px', padding: '6px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
    background: activo ? '#F0C84A' : 'transparent',
    color: activo ? '#1A3A2A' : '#A8D5B8', fontWeight: 500
  }
}

function App() {
  const [vista, setVista] = useState('ventas')
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

  const actual = VISTAS.find(function (v) { return v.id === vista }) || VISTAS[0]
  const Vista = actual.Componente

  return (
    <RolContext.Provider value={{ esAdmin: rol === 'admin' }}>
      <div>
        <div style={{ background: '#0F2419', padding: '8px 1.5rem', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {VISTAS.map(function (v) {
            return (
              <button key={v.id} onClick={function () { setVista(v.id) }} style={botonEstilo(vista === v.id)}>{v.label}</button>
            )
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#A8D5B8' }}>
            <span>{session.user.email}{rol === 'admin' ? ' (admin)' : ''}</span>
            <button onClick={cerrarSesion} style={{ fontSize: '12px', padding: '5px 12px', border: '1px solid #A8D5B8', borderRadius: '8px', background: 'transparent', color: '#A8D5B8', cursor: 'pointer' }}>
              Cerrar sesion
            </button>
          </div>
        </div>

        <Vista />
      </div>
    </RolContext.Provider>
  )
}

export default App
