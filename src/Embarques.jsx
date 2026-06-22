import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconTruck, IconPlus, IconX, IconCheck, IconPackage, IconBuildingStore, IconChartBar, IconAlertTriangle } from '@tabler/icons-react'

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

const ESTADOS = [
  { id: 'pendiente', label: 'Pendiente', color: '#7A7060' },
  { id: 'en_transito', label: 'En tránsito', color: '#C8860A' },
  { id: 'entregado', label: 'Entregado', color: '#2E6B4A' },
  { id: 'cancelado', label: 'Cancelado', color: '#C0321A' },
]

const TIPOS_EMBARQUE = [
  { id: 'paqueteria', label: 'Paquetería', icon: IconPackage },
  { id: 'propio', label: 'Transporte propio', icon: IconTruck },
  { id: 'recoleccion', label: 'Recolección en tienda', icon: IconBuildingStore },
]

const MOTIVOS_FALTANTE = [
  { id: '', label: '— Sin especificar —' },
  { id: 'devolucion', label: 'Devolución de cliente' },
  { id: 'logistica', label: 'Proveedor logístico no llegó a tiempo' },
  { id: 'produccion', label: 'No se produjo el producto' },
  { id: 'otro', label: 'Otro' },
]

function Embarques() {
  const [embarques, setEmbarques] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [pedidoId, setPedidoId] = useState('')
  const [tipoEmbarque, setTipoEmbarque] = useState('paqueteria')
  const [carrier, setCarrier] = useState('')
  const [destino, setDestino] = useState('')
  const [fechaEstimada, setFechaEstimada] = useState('')

  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false)
  const [embarqueEntrega, setEmbarqueEntrega] = useState(null)
  const [itemsEntrega, setItemsEntrega] = useState([])
  const [guardandoEntrega, setGuardandoEntrega] = useState(false)

  useEffect(function () {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const resEmb = await supabase
      .from('embarques')
      .select('*, pedidos(folio, total, etapa, tipo_entrega, clientes(nombre, nombre_comercial, color, iniciales))')
      .order('created_at', { ascending: false })
    setEmbarques(resEmb.data || [])

    const resPed = await supabase
      .from('pedidos')
      .select('*, clientes(nombre, nombre_comercial)')
      .order('created_at', { ascending: false })
    setPedidos(resPed.data || [])

    setCargando(false)
  }

  function abrirNuevo() {
    setPedidoId('')
    setTipoEmbarque('paqueteria')
    setCarrier('')
    setDestino('')
    setFechaEstimada('')
    setModalAbierto(true)
  }

  async function guardarEmbarque() {
    if (!pedidoId) {
      alert('Selecciona un pedido')
      return
    }
    setGuardando(true)

    const resp = await supabase.from('embarques').insert([{
      pedido_id: pedidoId,
      tipo_embarque: tipoEmbarque,
      carrier: carrier,
      destino: destino,
      fecha_estimada: fechaEstimada,
      estado: 'pendiente'
    }])

    setGuardando(false)

    if (resp.error) {
      alert('Error al guardar: ' + resp.error.message)
      return
    }

    setModalAbierto(false)
    cargarTodo()
  }

  async function cambiarEstado(embarque, nuevoEstado) {
    if (nuevoEstado === 'entregado') {
      abrirModalEntrega(embarque)
      return
    }
    const resp = await supabase.from('embarques').update({ estado: nuevoEstado }).eq('id', embarque.id)
    if (!resp.error) {
      setEmbarques(function (prev) {
        return prev.map(function (e) {
          if (e.id === embarque.id) return Object.assign({}, e, { estado: nuevoEstado })
          return e
        })
      })
    }
  }

  async function abrirModalEntrega(embarque) {
    setEmbarqueEntrega(embarque)
    const resItems = await supabase
      .from('pedido_items')
      .select('*, productos(sku, nombre, unidad)')
      .eq('pedido_id', embarque.pedido_id)

    const items = (resItems.data || []).map(function (it) {
      return {
        id: it.id,
        producto: it.productos,
        cantidadPedida: it.cantidad,
        cantidadEntregada: it.cantidad,
        motivoFaltante: '',
        motivoOtro: ''
      }
    })
    setItemsEntrega(items)
    setModalEntregaAbierto(true)
  }

  function actualizarItemEntrega(index, campo, valor) {
    setItemsEntrega(function (prev) {
      return prev.map(function (it, i) {
        if (i !== index) return it
        const copia = Object.assign({}, it)
        copia[campo] = valor
        return copia
      })
    })
  }

  async function confirmarEntrega() {
    setGuardandoEntrega(true)

    try {
      for (let i = 0; i < itemsEntrega.length; i++) {
        const it = itemsEntrega[i]
        const resp = await supabase
          .from('pedido_items')
          .update({
            cantidad_entregada: it.cantidadEntregada,
            motivo_faltante: Number(it.cantidadEntregada) < Number(it.cantidadPedida) ? it.motivoFaltante : null,
            motivo_otro: it.motivoFaltante === 'otro' ? it.motivoOtro : null
          })
          .eq('id', it.id)
        if (resp.error) throw resp.error
      }

      const todoCompleto = itemsEntrega.every(function (it) {
        return Number(it.cantidadEntregada) >= Number(it.cantidadPedida)
      })

      await supabase
        .from('pedidos')
        .update({ tipo_entrega: todoCompleto ? 'completa' : 'parcial' })
        .eq('id', embarqueEntrega.pedido_id)

      await supabase
        .from('embarques')
        .update({ estado: 'entregado' })
        .eq('id', embarqueEntrega.id)

      setModalEntregaAbierto(false)
      setEmbarqueEntrega(null)
      cargarTodo()
    } catch (err) {
      alert('Error al guardar la entrega: ' + err.message)
    } finally {
      setGuardandoEntrega(false)
    }
  }

  function getEstadoInfo(id) {
    for (let i = 0; i < ESTADOS.length; i++) {
      if (ESTADOS[i].id === id) return ESTADOS[i]
    }
    return ESTADOS[0]
  }

  function getTipoInfo(id) {
    for (let i = 0; i < TIPOS_EMBARQUE.length; i++) {
      if (TIPOS_EMBARQUE[i].id === id) return TIPOS_EMBARQUE[i]
    }
    return TIPOS_EMBARQUE[0]
  }

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando embarques...</p>
  }

  const totalEmb = embarques.length
  const enTransito = embarques.filter(function (e) { return e.estado === 'en_transito' }).length
  const entregados = embarques.filter(function (e) { return e.estado === 'entregado' }).length
  const pendientes = embarques.filter(function (e) { return e.estado === 'pendiente' }).length

  const embarquesEntregados = embarques.filter(function (e) { return e.estado === 'entregado' })
  const montoEntregado = embarquesEntregados.reduce(function (acc, e) {
    const ped = e.pedidos
    return acc + (ped ? Number(ped.total) : 0)
  }, 0)
  const pedidosCompletos = embarquesEntregados.filter(function (e) {
    const ped = e.pedidos
    return ped && ped.tipo_entrega === 'completa'
  }).length
  const pedidosIncompletos = embarquesEntregados.length - pedidosCompletos
  const pctCompletos = embarquesEntregados.length > 0
    ? Math.round((pedidosCompletos / embarquesEntregados.length) * 100)
    : 0

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>
          MC
        </div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Embarques y entregas</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ background: COLORES.verde, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: COLORES.claro, fontSize: '11px', textTransform: 'uppercase' }}>Total embarques</div>
            <div style={{ color: COLORES.amarillo, fontSize: '22px', fontWeight: 500 }}>{totalEmb}</div>
          </div>
          <div style={{ background: COLORES.dorado, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#fff8e0', fontSize: '11px', textTransform: 'uppercase' }}>En tránsito</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{enTransito}</div>
          </div>
          <div style={{ background: COLORES.verde2, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#c0f0d8', fontSize: '11px', textTransform: 'uppercase' }}>Entregados</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{entregados}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd8cc', borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#7A7060', fontSize: '11px', textTransform: 'uppercase' }}>Pendientes</div>
            <div style={{ color: COLORES.dorado, fontSize: '22px', fontWeight: 500 }}>{pendientes}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0' }}>
            <strong style={{ fontSize: '13px' }}>
              <IconChartBar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Estadísticas de pedidos entregados
            </strong>
          </div>
          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#7A7060', textTransform: 'uppercase', marginBottom: '4px' }}>Pedidos entregados</div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: COLORES.verde }}>{embarquesEntregados.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7A7060', textTransform: 'uppercase', marginBottom: '4px' }}>Monto entregado</div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: COLORES.verde2 }}>${montoEntregado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7A7060', textTransform: 'uppercase', marginBottom: '4px' }}>Completos vs incompletos</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '20px', fontWeight: 500, color: COLORES.verde2 }}>{pedidosCompletos}</span>
                <span style={{ fontSize: '12px', color: '#7A7060' }}>completos</span>
                <span style={{ fontSize: '20px', fontWeight: 500, color: '#C0321A' }}>{pedidosIncompletos}</span>
                <span style={{ fontSize: '12px', color: '#7A7060' }}>incompletos</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7A7060', textTransform: 'uppercase', marginBottom: '4px' }}>% Cumplimiento</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, background: '#E8E0D0', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pctCompletos + '%', background: pctCompletos >= 80 ? COLORES.verde2 : COLORES.dorado, borderRadius: '999px' }}></div>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 500, color: pctCompletos >= 80 ? COLORES.verde2 : COLORES.dorado }}>{pctCompletos}%</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>
              <IconTruck size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Embarques registrados
            </strong>
            <button onClick={abrirNuevo} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconPlus size={14} /> Nuevo embarque
            </button>
          </div>

          {embarques.length === 0 ? (
            <p style={{ padding: '1.5rem', fontSize: '13px', color: '#7A7060', textAlign: 'center' }}>Sin embarques registrados.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6EE' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Pedido</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Destino</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Fecha est.</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {embarques.map(function (e) {
                  const estadoInfo = getEstadoInfo(e.estado)
                  const tipoInfo = getTipoInfo(e.tipo_embarque)
                  const TipoIcon = tipoInfo.icon
                  const ped = e.pedidos
                  const cli = ped ? ped.clientes : null
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f0e8d8' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde2 }}>
                        {(ped && ped.folio) || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: (cli && cli.color) || COLORES.verde2, color: '#fff', fontSize: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(cli && cli.iniciales) || '—'}
                          </div>
                          {(cli && (cli.nombre_comercial || cli.nombre)) || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#5A5040' }}>
                        <TipoIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: '#7A7060' }} />
                        {tipoInfo.label}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#7A7060' }}>{e.destino || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#7A7060' }}>{e.fecha_estimada || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', background: estadoInfo.color + '22', color: estadoInfo.color }}>
                          {estadoInfo.label}
                          {e.estado === 'entregado' && ped && ped.tipo_entrega === 'parcial' && (
                            <IconAlertTriangle size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={e.estado}
                          onChange={function (ev) { cambiarEstado(e, ev.target.value) }}
                          style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', border: '1px solid #ddd8cc', background: '#FAF6EE' }}
                        >
                          {ESTADOS.map(function (s) {
                            return <option key={s.id} value={s.id}>{s.label}</option>
                          })}
                        </select>
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
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Nuevo embarque</h3>
              <button onClick={function () { setModalAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <label style={labelStyle}>Pedido *</label>
            <select style={inputStyle} value={pedidoId} onChange={function (e) { setPedidoId(e.target.value) }}>
              <option value="">Seleccionar...</option>
              {pedidos.map(function (p) {
                const cli = p.clientes
                return <option key={p.id} value={p.id}>{p.folio} — {(cli && (cli.nombre_comercial || cli.nombre)) || '—'}</option>
              })}
            </select>

            <label style={labelStyle}>Tipo de embarque</label>
            <select style={inputStyle} value={tipoEmbarque} onChange={function (e) { setTipoEmbarque(e.target.value) }}>
              {TIPOS_EMBARQUE.map(function (t) {
                return <option key={t.id} value={t.id}>{t.label}</option>
              })}
            </select>

            <label style={labelStyle}>Carrier / Transportista</label>
            <input style={inputStyle} value={carrier} onChange={function (e) { setCarrier(e.target.value) }} placeholder="Ej. FedEx, DHL, Unidad 03..." />

            <label style={labelStyle}>Destino</label>
            <input style={inputStyle} value={destino} onChange={function (e) { setDestino(e.target.value) }} placeholder="Ciudad, Estado" />

            <label style={labelStyle}>Fecha estimada de entrega</label>
            <input type="date" style={inputStyle} value={fechaEstimada} onChange={function (e) { setFechaEstimada(e.target.value) }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e8e0d0' }}>
              <button onClick={function () { setModalAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarEmbarque} disabled={guardando} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardando ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {guardando ? 'Guardando...' : (<span><IconCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Registrar embarque</span>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEntregaAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid ' + COLORES.dorado }}>
              <div>
                <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Confirmar entrega</h3>
                <p style={{ fontSize: '12px', color: '#7A7060', margin: '4px 0 0' }}>Captura cuánto se entregó realmente de cada producto</p>
              </div>
              <button onClick={function () { setModalEntregaAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Producto</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Pedido</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Entregado</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Motivo del faltante</th>
                </tr>
              </thead>
              <tbody>
                {itemsEntrega.map(function (it, i) {
                  const faltante = Number(it.cantidadEntregada) < Number(it.cantidadPedida)
                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f0e8d8' }}>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 500 }}>{(it.producto && it.producto.nombre) || '—'}</div>
                        <div style={{ fontSize: '10px', color: '#7A7060' }}>{(it.producto && it.producto.sku) || ''}</div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{it.cantidadPedida}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max={it.cantidadPedida}
                          value={it.cantidadEntregada}
                          onChange={function (e) { actualizarItemEntrega(i, 'cantidadEntregada', parseFloat(e.target.value) || 0) }}
                          style={{ width: '70px', fontSize: '12px', padding: '4px 6px', border: '1px solid ' + (faltante ? '#F0C0B8' : '#ddd8cc'), borderRadius: '6px', background: faltante ? '#FFE0DB' : '#FAF6EE', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        {faltante ? (
                          <div>
                            <select
                              value={it.motivoFaltante}
                              onChange={function (e) { actualizarItemEntrega(i, 'motivoFaltante', e.target.value) }}
                              style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd8cc', background: '#FAF6EE', width: '100%' }}
                            >
                              {MOTIVOS_FALTANTE.map(function (m) {
                                return <option key={m.id} value={m.id}>{m.label}</option>
                              })}
                            </select>
                            {it.motivoFaltante === 'otro' && (
                              <input
                                type="text"
                                placeholder="Especificar..."
                                value={it.motivoOtro}
                                onChange={function (e) { actualizarItemEntrega(i, 'motivoOtro', e.target.value) }}
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd8cc', background: '#FAF6EE', width: '100%', marginTop: '4px' }}
                              />
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: COLORES.verde2 }}>Completo ✓</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '1rem', borderTop: '1px solid #e8e0d0' }}>
              <button onClick={function () { setModalEntregaAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarEntrega} disabled={guardandoEntrega} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardandoEntrega ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {guardandoEntrega ? 'Guardando...' : (<span><IconCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Confirmar entrega</span>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Embarques