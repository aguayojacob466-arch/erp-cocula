import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconBox, IconPlus, IconX, IconCheck, IconTrash } from '@tabler/icons-react'

const COLORES = {
  verde: '#1A3A2A',
  verde2: '#2E6B4A',
  dorado: '#C8860A',
  amarillo: '#F0C84A',
  crema: '#F5F0E8',
  claro: '#A8D5B8',
}

const inputStyle = {
  width: '100%', fontSize: '13px', border: '1px solid #ddd8cc', borderRadius: '8px',
  padding: '8px 10px', background: '#FAF6EE', color: '#3A3020', outline: 'none', marginBottom: '12px',
  boxSizing: 'border-box'
}
const labelStyle = {
  fontSize: '11px', color: '#7A7060', display: 'block', marginBottom: '4px',
  fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px'
}

function Productos() {
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [filtroCliente, setFiltroCliente] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [clienteId, setClienteId] = useState('')
  const [sku, setSku] = useState('')
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('Caja')
  const [piezasCaja, setPiezasCaja] = useState(12)
  const [precio, setPrecio] = useState(0)

  useEffect(function () {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const resCl = await supabase.from('clientes').select('*')
    setClientes(resCl.data || [])

    const resProd = await supabase
      .from('productos')
      .select('*, clientes(nombre, nombre_comercial, color, iniciales)')
      .order('created_at', { ascending: false })
    setProductos(resProd.data || [])

    setCargando(false)
  }

  function abrirNuevo() {
    setClienteId('')
    setSku('')
    setNombre('')
    setUnidad('Caja')
    setPiezasCaja(12)
    setPrecio(0)
    setModalAbierto(true)
  }

  async function guardarProducto() {
    if (!clienteId) {
      alert('Selecciona un cliente')
      return
    }
    if (!sku.trim() || !nombre.trim()) {
      alert('El SKU y el nombre son obligatorios')
      return
    }
    setGuardando(true)

    const resp = await supabase.from('productos').insert([{
      cliente_id: clienteId,
      sku: sku,
      nombre: nombre,
      unidad: unidad,
      piezas_caja: piezasCaja,
      precio_pactado: precio
    }])

    setGuardando(false)

    if (resp.error) {
      alert('Error al guardar: ' + resp.error.message)
      return
    }

    setModalAbierto(false)
    cargarTodo()
  }

  async function eliminarProducto(producto) {
    const ok = window.confirm('¿Eliminar el producto ' + producto.sku + '?')
    if (!ok) return
    const resp = await supabase.from('productos').delete().eq('id', producto.id)
    if (!resp.error) {
      setProductos(function (prev) {
        return prev.filter(function (p) { return p.id !== producto.id })
      })
    }
  }

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando productos...</p>
  }

  const productosFiltrados = filtroCliente
    ? productos.filter(function (p) { return p.cliente_id === filtroCliente })
    : productos

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>
          MC
        </div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Productos</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ fontSize: '13px' }}>
              <IconBox size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Catálogo de productos
            </strong>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={filtroCliente}
                onChange={function (e) { setFiltroCliente(e.target.value) }}
                style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd8cc', background: '#FAF6EE' }}
              >
                <option value="">Todos los clientes</option>
                {clientes.map(function (c) {
                  return <option key={c.id} value={c.id}>{c.nombre_comercial || c.nombre}</option>
                })}
              </select>
              <button onClick={abrirNuevo} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconPlus size={14} /> Nuevo producto
              </button>
            </div>
          </div>

          {productosFiltrados.length === 0 ? (
            <p style={{ padding: '1.5rem', fontSize: '13px', color: '#7A7060', textAlign: 'center' }}>Sin productos registrados.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6EE' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>SKU</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Producto</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Unidad</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Pzas/caja</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Precio</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}></th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(function (p) {
                  const cli = p.clientes
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0e8d8' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde2 }}>{p.sku}</td>
                      <td style={{ padding: '10px 12px' }}>{p.nombre}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: (cli && cli.color) || COLORES.verde2, color: '#fff', fontSize: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(cli && cli.iniciales) || '—'}
                          </div>
                          {(cli && (cli.nombre_comercial || cli.nombre)) || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#7A7060' }}>{p.unidad}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{p.piezas_caja}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde }}>${Number(p.precio_pactado).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={function () { eliminarProducto(p) }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', border: '1px solid #F0C0B8', background: 'transparent', color: '#C0321A', cursor: 'pointer' }}>
                          <IconTrash size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid ' + COLORES.dorado }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Nuevo producto</h3>
              <button onClick={function () { setModalAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <label style={labelStyle}>Cliente *</label>
            <select style={inputStyle} value={clienteId} onChange={function (e) { setClienteId(e.target.value) }}>
              <option value="">Seleccionar...</option>
              {clientes.map(function (c) {
                return <option key={c.id} value={c.id}>{c.nombre_comercial || c.nombre}</option>
              })}
            </select>

            <label style={labelStyle}>SKU *</label>
            <input style={inputStyle} value={sku} onChange={function (e) { setSku(e.target.value) }} placeholder="Ej. WM-JAB-004" />

            <label style={labelStyle}>Nombre del producto *</label>
            <input style={inputStyle} value={nombre} onChange={function (e) { setNombre(e.target.value) }} placeholder="Ej. Jabón aloe vera 100g" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Unidad de venta</label>
                <select style={inputStyle} value={unidad} onChange={function (e) { setUnidad(e.target.value) }}>
                  <option>Caja</option>
                  <option>Pieza</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Piezas por caja</label>
                <input type="number" style={inputStyle} value={piezasCaja} onChange={function (e) { setPiezasCaja(parseInt(e.target.value) || 1) }} />
              </div>
            </div>

            <label style={labelStyle}>Precio pactado ($)</label>
            <input type="number" step="0.01" style={inputStyle} value={precio} onChange={function (e) { setPrecio(parseFloat(e.target.value) || 0) }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e8e0d0' }}>
              <button onClick={function () { setModalAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarProducto} disabled={guardando} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardando ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {guardando ? 'Guardando...' : (<span><IconCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Guardar producto</span>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Productos