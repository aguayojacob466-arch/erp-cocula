import { useState } from 'react'
import Dashboard from './Dashboard'
import Clientes from './Clientes'
import Pedidos from './Pedidos'
import Productos from './Productos'
import Embarques from './Embarques'
import Inventario from './Inventario'

function App() {
  const [vista, setVista] = useState('dashboard')

  function botonEstilo(activo) {
    return {
      fontSize: '12px', padding: '6px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
      background: activo ? '#F0C84A' : 'transparent',
      color: activo ? '#1A3A2A' : '#A8D5B8', fontWeight: 500
    }
  }

  return (
    <div>
      <div style={{ background: '#0F2419', padding: '8px 1.5rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={function () { setVista('dashboard') }} style={botonEstilo(vista === 'dashboard')}>Dashboard</button>
        <button onClick={function () { setVista('clientes') }} style={botonEstilo(vista === 'clientes')}>Clientes</button>
        <button onClick={function () { setVista('productos') }} style={botonEstilo(vista === 'productos')}>Productos</button>
        <button onClick={function () { setVista('pedidos') }} style={botonEstilo(vista === 'pedidos')}>Pedidos</button>
        <button onClick={function () { setVista('embarques') }} style={botonEstilo(vista === 'embarques')}>Embarques</button>
        <button onClick={function () { setVista('inventario') }} style={botonEstilo(vista === 'inventario')}>Inventario</button>
      </div>

      {vista === 'dashboard' && <Dashboard />}
      {vista === 'clientes' && <Clientes />}
      {vista === 'productos' && <Productos />}
      {vista === 'pedidos' && <Pedidos />}
      {vista === 'embarques' && <Embarques />}
      {vista === 'inventario' && <Inventario />}
    </div>
  )
}

export default App