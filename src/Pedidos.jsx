import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconClipboardList, IconPlus, IconX, IconCheck, IconTrash } from '@tabler/icons-react'

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

const ETAPAS = [
  { id: 'oc', label: 'OC recibida', color: '#7A7060' },
  { id: 'produccion', label: 'En producción', color: '#185FA5' },
  { id: 'listo', label: 'Listo p/ embarque', color: '#C8860A' },
  { id: 'embarque', label: 'En tránsito', color: '#7F77DD' },
  { id: 'entregado', label: 'Entregado', color: '#2E6B4A' },
]

function Pedidos() {
  const [clientes, setClientes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)

  const [clienteId, setClienteId] = useState('')
  const [productosCliente, setProductosCliente] = useState([])
  const [items, setItems] = useState([])
  const [folio, setFolio] = useState('')
  const [ocCliente, setOcCliente] = useState('')
  const [fecha, setFecha] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const { data: cl } = await supabase.from('clientes').select('*')
    setClientes(cl || [])

    const { data: ped } = await supabase
      .from('pedidos')
      .select('*, clientes(nombre, nombre_comercial, color, iniciales)')
      .order('created_at', { ascending: false })
    setPedidos(ped || [])

    setCargando(false)
  }

  function abrirNuevoPedido() {
    setClienteId('')
    setProductosCliente([])
    setItems([])
    setFolio('PED-' + Date.now().toString().slice(-6))
    setOcCliente('')
    setFecha(new Date().toISOString().split('T')[0])
    setFechaEntrega('')
    setModalAbierto(true)
  }

  async function onClienteChange(id) {
    setClienteId(id)
    setItems([])
    if (!id) {
      setProductosCliente([])
      return
    }
    const { data } = await supabase.from('productos').select('*').eq('cliente_id', id)
    setProductosCliente(data || [])
  }

  function agregarItem() {
    if (productosCliente.length === 0) return
    setItems(function (prev) {
      return prev.concat([{ producto_id: productosCliente[0].id, cantidad: 1, precio: productosCliente[0].precio_pactado }])
    })
  }

  function actualizarItem(index, campo, valor) {
    setItems(function (prev) {
      return prev.map(function (it, i) {
        if (i !== index) return it
        if (campo === 'producto_id') {
          const prod = productosCliente.find(function (p) { return p.id === valor })
          return Object.assign({}, it, { producto_id: valor, precio: prod ? prod.precio_pactado : it.precio })
        }
        const copia = Object.assign({}, it)
        copia[campo] = valor
        return copia
      })
    })
  }

  function quitarItem(index) {
    setItems(function (prev) {
      return prev.filter(function (_, i) { return i !== index })
    })
  }

  function calcularTotales() {
    const cliente = clientes.find(function (c) { return c.id === clienteId })
    let subtotal = 0
    for (let i = 0; i < items.length; i++) {
      subtotal += Number(items[i].cantidad) * Number(items[i].precio)
    }
    const descPct = cliente ? Number(cliente.descuento_logistica) || 0 : 0
    const descuento = subtotal * (descPct / 100)
    const total = subtotal - descuento
    return { subtotal: subtotal, descuento: descuento, total: total, descPct: descPct }
  }

  async function guardarPedido() {
    if (!clienteId) {
      alert('Selecciona un cliente')
      return
    }
    if (items.length === 0) {
      alert('Agrega al menos un producto')
      return
    }
    setGuardando(true)
    const totales = calcularTotales()
    const cliente = clientes.find(function (c) { return c.id === clienteId })

    try {
      const insertPedido = await supabase
        .from('pedidos')
        .insert([{
          folio: folio,
          cliente_id: clienteId,
          oc_cliente: ocCliente,
          fecha: fecha,
          fecha_entrega: fechaEntrega,
          subtotal: totales.subtotal,
          descuento_logistica: totales.descuento,
          total: totales.total,
          factoraje: cliente ? cliente.factoraje : false,
          etapa: 'oc'
        }])
        .select()
        .single()

      if (insertPedido.error) throw insertPedido.error

      const itemsParaGuardar = items.map(function (it) {
        return { pedido_id: insertPedido.data.id, producto_id: it.producto_id, cantidad: it.cantidad, precio: it.precio }
      })

      const insertItems = await supabase.from('pedido_items').insert(itemsParaGuardar)
      if (insertItems.error) throw insertItems.error

      setModalAbierto(false)
      cargarTodo()
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function avanzarEtapa(pedido) {
    let idx = -1
    for (let i = 0; i < ETAPAS.length; i++) {
      if (ETAPAS[i].id === pedido.etapa) idx = i
    }
    if (idx === ETAPAS.length - 1 || idx === -1) return
    const nuevaEtapa = ETAPAS[idx + 1].id
    const resp = await supabase.from('pedidos').update({ etapa: nuevaEtapa }).eq('id', pedido.id)
    if (!resp.error) {
      setPedidos(function (prev) {
        return prev.map(function (p) {
          if (p.id === pedido.id) return Object.assign({}, p, { etapa: nuevaEtapa })
          return p
        })
      })
    }
  }

  async function eliminarPedido(pedido) {
    const ok = window.confirm('¿Eliminar el pedido ' + pedido.folio + '?')
    if (!ok) return
    const resp = await supabase.from('pedidos').delete().eq('id', pedido.id)
    if (!resp.error) {
      setPedidos(function (prev) {
        return prev.filter(function (p) { return p.id !== pedido.id })
      })
    }
  }

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando pedidos...</p>
  }

  const totales = calcularTotales()

  function getEtapaInfo(etapaId) {
    for (let i = 0; i < ETAPAS.length; i++) {
      if (ETAPAS[i].id === etapaId) return ETAPAS[i]
    }
    return ETAPAS[0]
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>
          MC
        </div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Pedidos</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>
              <IconClipboardList size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Pedidos registrados
            </strong>
            <button onClick={abrirNuevoPedido} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconPlus size={14} /> Nuevo pedido
            </button>
          </div>

          {pedidos.length === 0 ? (
            <p style={{ padding: '1.5rem', fontSize: '13px', color: '#7A7060', textAlign: 'center' }}>Sin pedidos registrados aún.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6EE' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Folio</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>OC Cliente</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Entrega</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Total</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Etapa</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(function (p) {
                  const etapaInfo = getEtapaInfo(p.etapa)
                  const cli = p.clientes
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0e8d8' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde2 }}>{p.folio}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: (cli && cli.color) || COLORES.verde2, color: '#fff', fontSize: '9px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(cli && cli.iniciales) || '—'}
                          </div>
                          {(cli && (cli.nombre_comercial || cli.nombre)) || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#7A7060' }}>{p.oc_cliente || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#7A7060' }}>{p.fecha_entrega || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde }}>${Number(p.total).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', background: etapaInfo.color + '22', color: etapaInfo.color }}>
                          {etapaInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {p.etapa !== 'entregado' && (
                            <button onClick={function () { avanzarEtapa(p) }} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid ' + COLORES.dorado, background: 'transparent', color: COLORES.dorado, cursor: 'pointer' }}>
                              Avanzar
                            </button>
                          )}
                          <button onClick={function () { eliminarPedido(p) }} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', border: '1px solid #F0C0B8', background: 'transparent', color: '#C0321A', cursor: 'pointer' }}>
                            <IconTrash size={12} />
                          </button>
                        </div>
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
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid ' + COLORES.dorado }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Nuevo pedido</h3>
              <button onClick={function () { setModalAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px 20px' }}>
              <div>
                <label style={labelStyle}>Cliente *</label>
                <select style={inputStyle} value={clienteId} onChange={function (e) { onClienteChange(e.target.value) }}>
                  <option value="">Seleccionar...</option>
                  {clientes.map(function (c) {
                    return <option key={c.id} value={c.id}>{c.nombre_comercial || c.nombre}</option>
                  })}
                </select>

                <label style={labelStyle}>Folio interno</label>
                <input style={inputStyle} value={folio} onChange={function (e) { setFolio(e.target.value) }} />
              </div>
              <div>
                <label style={labelStyle}>OC del cliente</label>
                <input style={inputStyle} value={ocCliente} onChange={function (e) { setOcCliente(e.target.value) }} placeholder="OC-12345" />

                <label style={labelStyle}>Fecha de entrega</label>
                <input type="date" style={inputStyle} value={fechaEntrega} onChange={function (e) { setFechaEntrega(e.target.value) }} />
              </div>
            </div>

            {clienteId && (function () {
              let clienteSeleccionado = null
              for (let i = 0; i < clientes.length; i++) {
                if (clientes[i].id === clienteId) clienteSeleccionado = clientes[i]
              }
              if (!clienteSeleccionado) return null
              return (
                <div style={{ background: '#F0FAF4', border: '1px solid ' + COLORES.verde2, borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px' }}>
                  <span>Crédito: <strong>{clienteSeleccionado.dias_credito} días</strong> · Desc. log.: <strong>{clienteSeleccionado.descuento_logistica}%</strong> · Factoraje: <strong>{clienteSeleccionado.factoraje ? 'Sí' : 'No'}</strong></span>
                </div>
              )
            })()}

            <label style={labelStyle}>Productos</label>
            {items.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#7A7060', marginBottom: '10px' }}>
                {clienteId ? 'Sin productos agregados.' : 'Selecciona un cliente primero.'}
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Producto</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Cant.</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Precio</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(function (it, i) {
                    return (
                      <tr key={i}>
                        <td style={{ padding: '4px 6px' }}>
                          <select style={Object.assign({}, inputStyle, { marginBottom: 0, fontSize: '11px' })} value={it.producto_id} onChange={function (e) { actualizarItem(i, 'producto_id', e.target.value) }}>
                            {productosCliente.map(function (p) {
                              return <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
                            })}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input type="number" min="1" style={Object.assign({}, inputStyle, { marginBottom: 0, width: '60px', fontSize: '11px' })} value={it.cantidad} onChange={function (e) { actualizarItem(i, 'cantidad', parseInt(e.target.value) || 1) }} />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input type="number" step="0.01" style={Object.assign({}, inputStyle, { marginBottom: 0, width: '80px', fontSize: '11px' })} value={it.precio} onChange={function (e) { actualizarItem(i, 'precio', parseFloat(e.target.value) || 0) }} />
                        </td>
                        <td style={{ padding: '4px 6px', fontWeight: 500, color: COLORES.verde2 }}>
                          ${(it.cantidad * it.precio).toFixed(2)}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <button onClick={function () { quitarItem(i) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0321A' }}>
                            <IconTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <button onClick={agregarItem} disabled={!clienteId || productosCliente.length === 0} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: clienteId ? 'pointer' : 'not-allowed', color: '#5A5040', marginBottom: '14px', opacity: clienteId ? 1 : 0.5 }}>
              <IconPlus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Agregar producto
            </button>

            <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: '#7A7060' }}>
                Subtotal: ${totales.subtotal.toFixed(2)}<br />
                {totales.descPct > 0 && <span style={{ color: COLORES.dorado }}>Desc. logística ({totales.descPct}%): -${totales.descuento.toFixed(2)}</span>}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: COLORES.verde }}>
                ${totales.total.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '1rem', borderTop: '1px solid #e8e0d0' }}>
              <button onClick={function () { setModalAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarPedido} disabled={guardando} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardando ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {guardando ? 'Guardando...' : (<span><IconCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Registrar pedido</span>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos