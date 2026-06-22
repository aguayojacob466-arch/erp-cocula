import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconUsers, IconClipboardList, IconTruck } from '@tabler/icons-react'

const COLORES = {
  verde: '#1A3A2A',
  verde2: '#2E6B4A',
  dorado: '#C8860A',
  amarillo: '#F0C84A',
  crema: '#F5F0E8',
  claro: '#A8D5B8'
}

function Dashboard() {
  const [clientes, setClientes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [embarques, setEmbarques] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(function () {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const resCl = await supabase.from('clientes').select('*')
    setClientes(resCl.data ? resCl.data : [])

    const resPed = await supabase
      .from('pedidos')
      .select('*, clientes(nombre, nombre_comercial, color, iniciales)')
      .order('created_at', { ascending: false })
    setPedidos(resPed.data ? resPed.data : [])

    const resEmb = await supabase
      .from('embarques')
      .select('*, pedidos(folio, total, tipo_entrega)')
      .order('created_at', { ascending: false })
    setEmbarques(resEmb.data ? resEmb.data : [])

    setCargando(false)
  }

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando dashboard...</p>
  }

  let totalVentas = 0
  for (let i = 0; i < pedidos.length; i++) {
    totalVentas = totalVentas + Number(pedidos[i].total)
  }

  let pedidosActivos = 0
  for (let i = 0; i < pedidos.length; i++) {
    if (pedidos[i].etapa !== 'entregado') {
      pedidosActivos = pedidosActivos + 1
    }
  }

  let clientesRiesgo = 0
  for (let i = 0; i < clientes.length; i++) {
    if (clientes[i].salud === 'riesgo') {
      clientesRiesgo = clientesRiesgo + 1
    }
  }

  let embarquesPendientes = 0
  let embarquesTransito = 0
  let embarquesEntregados = 0
  for (let i = 0; i < embarques.length; i++) {
    if (embarques[i].estado === 'pendiente') embarquesPendientes = embarquesPendientes + 1
    if (embarques[i].estado === 'en_transito') embarquesTransito = embarquesTransito + 1
    if (embarques[i].estado === 'entregado') embarquesEntregados = embarquesEntregados + 1
  }

  const pedidosRecientes = pedidos.slice(0, 5)

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>
          MC
        </div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px' }}>DASHBOARD EJECUTIVO</div>
        </div>
      </div>

      <div style={{ padding: '24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: COLORES.verde, borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: COLORES.claro, fontSize: '11px' }}>VENTAS TOTALES</div>
            <div style={{ color: COLORES.amarillo, fontSize: '22px', fontWeight: 500 }}>
              ${totalVentas.toFixed(2)}
            </div>
          </div>
          <div style={{ background: COLORES.dorado, borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#fff', fontSize: '11px' }}>PEDIDOS ACTIVOS</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{pedidosActivos}</div>
          </div>
          <div style={{ background: COLORES.verde2, borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#fff', fontSize: '11px' }}>TOTAL CLIENTES</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{clientes.length}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd8cc', borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: '#7A7060', fontSize: '11px' }}>CLIENTES EN RIESGO</div>
            <div style={{ color: COLORES.dorado, fontSize: '22px', fontWeight: 500 }}>{clientesRiesgo}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '20px', marginBottom: '20px' }}>
          <strong style={{ fontSize: '13px', display: 'block', marginBottom: '12px' }}>Estado de embarques</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: COLORES.dorado }}>{embarquesPendientes}</div>
              <div style={{ fontSize: '10px', color: '#7A7060' }}>PENDIENTES</div>
            </div>
            <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: '#7F77DD' }}>{embarquesTransito}</div>
              <div style={{ fontSize: '10px', color: '#7A7060' }}>EN TRANSITO</div>
            </div>
            <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: COLORES.verde2 }}>{embarquesEntregados}</div>
              <div style={{ fontSize: '10px', color: '#7A7060' }}>ENTREGADOS</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e0d0' }}>
            <strong style={{ fontSize: '13px' }}>Pedidos recientes</strong>
          </div>
          {pedidosRecientes.length === 0 ? (
            <p style={{ padding: '24px', fontSize: '13px', color: '#7A7060', textAlign: 'center' }}>
              Sin pedidos aun.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6EE' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060' }}>FOLIO</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060' }}>CLIENTE</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {pedidosRecientes.map(function (p) {
                  const cli = p.clientes
                  let nombreCliente = '—'
                  if (cli) {
                    if (cli.nombre_comercial) {
                      nombreCliente = cli.nombre_comercial
                    } else {
                      nombreCliente = cli.nombre
                    }
                  }
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0e8d8' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde2 }}>{p.folio}</td>
                      <td style={{ padding: '10px 12px' }}>{nombreCliente}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: COLORES.verde }}>
                        ${Number(p.total).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard