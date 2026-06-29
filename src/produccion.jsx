import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconTools, IconPlus, IconX, IconCheck } from '@tabler/icons-react'

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

function Produccion() {
  const [lotes, setLotes] = useState([])
  const [productos, setProductos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [tipo, setTipo] = useState('lote')
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState(0)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [pedidoId, setPedidoId] = useState('')

  useEffect(function () {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const resLotes = await supabase
      .from('lotes_produccion')
      .select('*, productos(sku, nombre), pedidos(folio)')
      .order('created_at', { ascending: false })
    setLotes(resLotes.data || [])

    const resProd = await supabase.from('productos').select('*')
    setProductos(resProd.data || [])

    const resPed = await supabase.from('pedidos').select('*')
    setPedidos(resPed.data || [])

    setCargando(false)
  }

  function abrirNuevo() {
    setTipo('lote')
    setProductoId('')
    setCantidad(0)
    setFechaInicio(new Date().toISOString().split('T')[0])
    setFechaFin('')
    setPedidoId('')
    setModalAbierto(true)
  }

  async function guardarLote() {
    if (!productoId) {
      window.alert('Selecciona un producto')
      return
    }
    if (cantidad <= 0) {
      window.alert('La cantidad debe ser mayor a 0')
      return
    }
    setGuardando(true)

    const resp = await supabase.from('lotes_produccion').insert([{
      producto_id: productoId,
      tipo: tipo,
      cantidad: cantidad,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      pedido_id: tipo === 'pedido' ? pedidoId : null,
      avance: 0,
      estado: 'programado'
    }])

    setGuardando(false)

    if (resp.error) {
      window.alert('Error: ' + resp.error.message)
      return
    }

    setModalAbierto(false)
    cargarTodo()
  }

  async function avanzarLote(lote) {
    const nuevoAvance = Math.min(Number(lote.avance) + 25, 100)
    const nuevoEstado = nuevoAvance === 100 ? 'terminado' : 'produccion'

    const resp = await supabase
      .from('lotes_produccion')
      .update({ avance: nuevoAvance, estado: nuevoEstado })
      .eq('id', lote.id)

    if (!resp.error) {
      setLotes(function (prev) {
        return prev.map(function (l) {
          if (l.id === lote.id) return Object.assign({}, l, { avance: nuevoAvance, estado: nuevoEstado })
          return l
        })
      })
    }
  }

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando produccion...</p>
  }

  const lotesActivos = lotes.filter(function (l) { return l.estado !== 'terminado' }).length
  let cajasEnProceso = 0
  for (let i = 0; i < lotes.length; i++) {
    if (lotes[i].estado === 'produccion') cajasEnProceso = cajasEnProceso + Number(lotes[i].cantidad)
  }
  const lotesContraPedido = lotes.filter(function (l) { return l.tipo === 'pedido' }).length
  const lotesPorStock = lotes.filter(function (l) { return l.tipo === 'lote' }).length

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>MC</div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Produccion</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ background: COLORES.verde, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: COLORES.claro, fontSize: '11px', textTransform: 'uppercase' }}>Lotes activos</div>
            <div style={{ color: COLORES.amarillo, fontSize: '22px', fontWeight: 500 }}>{lotesActivos}</div>
          </div>
          <div style={{ background: COLORES.verde2, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#c0f0d8', fontSize: '11px', textTransform: 'uppercase' }}>Cajas en proceso</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{cajasEnProceso}</div>
          </div>
          <div style={{ background: COLORES.dorado, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#fff8e0', fontSize: '11px', textTransform: 'uppercase' }}>Contra pedido</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{lotesContraPedido}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd8cc', borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#7A7060', fontSize: '11px', textTransform: 'uppercase' }}>Por lote (stock)</div>
            <div style={{ color: COLORES.verde, fontSize: '22px', fontWeight: 500 }}>{lotesPorStock}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>
              <IconTools size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Lotes de produccion
            </strong>
            <button onClick={abrirNuevo} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconPlus size={14} /> Nuevo lote
            </button>
          </div>

          {lotes.length === 0 ? (
            <p style={{ padding: '1.5rem', fontSize: '13px', color: '#7A7060', textAlign: 'center' }}>Sin lotes registrados.</p>
          ) : (
            <div style={{ padding: '1rem' }}>
              {lotes.map(function (l) {
                const prod = l.productos
                const ped = l.pedidos
                const color = l.avance === 100 ? COLORES.verde2 : (l.avance > 0 ? COLORES.dorado : '#E8E0D0')
                return (
                  <div key={l.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '0.9rem 1rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: COLORES.verde2 }}>
                          {(prod && prod.sku) || '—'} - {(prod && prod.nombre) || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', background: l.tipo === 'pedido' ? '#E0F0FF' : '#EDE8F8', color: l.tipo === 'pedido' ? '#185FA5' : '#4A3A8A' }}>
                          {l.tipo === 'pedido' ? 'Contra pedido' : 'Por lote'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px', background: l.estado === 'terminado' ? '#D4F0E2' : '#FFF0CC', color: l.estado === 'terminado' ? '#1A5C37' : '#8A5A00' }}>
                          {l.estado}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#5A5040', marginBottom: '6px' }}>
                      {l.cantidad} cajas - {l.fecha_inicio} a {l.fecha_fin} {ped ? '- Pedido: ' + ped.folio : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, background: '#E8E0D0', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: l.avance + '%', background: color, borderRadius: '999px' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: color, minWidth: '36px', textAlign: 'right' }}>{l.avance}%</span>
                      {l.estado !== 'terminado' && (
                        <button onClick={function () { avanzarLote(l) }} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid ' + COLORES.dorado, background: 'transparent', color: COLORES.dorado, cursor: 'pointer' }}>
                          Actualizar %
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Nuevo lote de produccion</h3>
              <button onClick={function () { setModalAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <label style={labelStyle}>Tipo de produccion</label>
            <select style={inputStyle} value={tipo} onChange={function (e) { setTipo(e.target.value) }}>
              <option value="lote">Por lote (para stock)</option>
              <option value="pedido">Contra pedido</option>
            </select>

            {tipo === 'pedido' && (
              <div>
                <label style={labelStyle}>Pedido vinculado</label>
                <select style={inputStyle} value={pedidoId} onChange={function (e) { setPedidoId(e.target.value) }}>
                  <option value="">Seleccionar...</option>
                  {pedidos.map(function (p) {
                    return <option key={p.id} value={p.id}>{p.folio}</option>
                  })}
                </select>
              </div>
            )}

            <label style={labelStyle}>Producto a fabricar *</label>
            <select style={inputStyle} value={productoId} onChange={function (e) { setProductoId(e.target.value) }}>
              <option value="">Seleccionar...</option>
              {productos.map(function (p) {
                return <option key={p.id} value={p.id}>{p.sku} - {p.nombre}</option>
              })}
            </select>

            <label style={labelStyle}>Cantidad a producir (cajas)</label>
            <input type="number" style={inputStyle} value={cantidad} onChange={function (e) { setCantidad(parseFloat(e.target.value) || 0) }} />

            <label style={labelStyle}>Fecha inicio</label>
            <input type="date" style={inputStyle} value={fechaInicio} onChange={function (e) { setFechaInicio(e.target.value) }} />

            <label style={labelStyle}>Fecha fin estimada</label>
            <input type="date" style={inputStyle} value={fechaFin} onChange={function (e) { setFechaFin(e.target.value) }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
              <button onClick={function () { setModalAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarLote} disabled={guardando} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? 'Guardando...' : 'Programar lote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Produccion