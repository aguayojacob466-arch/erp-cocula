import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconDroplet, IconPlus, IconX, IconCheck, IconEdit } from '@tabler/icons-react'

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

function nivelStock(stock, minimo) {
  if (stock <= 0) return { color: '#C0321A', label: 'Sin stock' }
  if (stock < minimo) return { color: '#C0321A', label: 'Critico' }
  if (stock < minimo * 1.5) return { color: '#C8860A', label: 'Bajo' }
  return { color: '#2E6B4A', label: 'Normal' }
}

function Inventario() {
  const [materias, setMaterias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [materiaId, setMateriaId] = useState('')
  const [cantidad, setCantidad] = useState(0)
  const [responsable, setResponsable] = useState('')
  const [fecha, setFecha] = useState('')

  const [modalEditar, setModalEditar] = useState(false)
  const [materiaEditando, setMateriaEditando] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editStock, setEditStock] = useState(0)
  const [editMinimo, setEditMinimo] = useState(0)
  const [editUnidad, setEditUnidad] = useState('kg')
  const [editProveedor, setEditProveedor] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  useEffect(function () {
    cargarMaterias()
  }, [])

  async function cargarMaterias() {
    const resp = await supabase.from('materias_primas').select('*').order('nombre')
    setMaterias(resp.data || [])
    setCargando(false)
  }

  function abrirNuevo() {
    setMateriaId('')
    setCantidad(0)
    setResponsable('')
    setFecha(new Date().toISOString().split('T')[0])
    setModalAbierto(true)
  }

  async function guardarEntrada() {
    if (!materiaId) {
      window.alert('Selecciona una materia prima')
      return
    }
    if (cantidad <= 0) {
      window.alert('La cantidad debe ser mayor a 0')
      return
    }
    setGuardando(true)

    const materia = materias.find(function (m) { return m.id === materiaId })
    const nuevoStock = Number(materia.stock) + Number(cantidad)

    const respUpdate = await supabase
      .from('materias_primas')
      .update({ stock: nuevoStock, ultima_entrada: fecha })
      .eq('id', materiaId)

    if (respUpdate.error) {
      window.alert('Error: ' + respUpdate.error.message)
      setGuardando(false)
      return
    }

    await supabase.from('movimientos_inventario').insert([{
      materia_prima_id: materiaId,
      tipo: 'entrada',
      cantidad: cantidad,
      responsable: responsable,
      fecha: fecha
    }])

    setGuardando(false)
    setModalAbierto(false)
    cargarMaterias()
  }

  function abrirEditar(materia) {
    setMateriaEditando(materia)
    setEditNombre(materia.nombre)
    setEditCategoria(materia.categoria || '')
    setEditStock(materia.stock)
    setEditMinimo(materia.minimo)
    setEditUnidad(materia.unidad || 'kg')
    setEditProveedor(materia.proveedor || '')
    setModalEditar(true)
  }

  async function guardarEdicion() {
    if (!editNombre.trim()) {
      window.alert('El nombre es obligatorio')
      return
    }
    setGuardandoEdicion(true)

    const stockAnterior = Number(materiaEditando.stock)
    const stockNuevo = Number(editStock)
    const diferencia = stockNuevo - stockAnterior

    const resp = await supabase
      .from('materias_primas')
      .update({
        nombre: editNombre,
        categoria: editCategoria,
        stock: stockNuevo,
        minimo: editMinimo,
        unidad: editUnidad,
        proveedor: editProveedor
      })
      .eq('id', materiaEditando.id)
      .select()
      .single()

    if (resp.error) {
      window.alert('Error: ' + resp.error.message)
      setGuardandoEdicion(false)
      return
    }

    if (diferencia !== 0) {
      await supabase.from('movimientos_inventario').insert([{
        materia_prima_id: materiaEditando.id,
        tipo: 'ajuste',
        cantidad: diferencia,
        responsable: 'Ajuste manual',
        fecha: new Date().toISOString().split('T')[0],
        nota: 'Ajuste de inventario desde ' + stockAnterior + ' a ' + stockNuevo
      }])
    }

    setMaterias(function (prev) {
      return prev.map(function (m) {
        if (m.id === resp.data.id) return resp.data
        return m
      })
    })

    setGuardandoEdicion(false)
    setModalEditar(false)
  }

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando inventario...</p>
  }

  let totalCritico = 0
  let totalBajo = 0
  for (let i = 0; i < materias.length; i++) {
    const m = materias[i]
    if (m.stock < m.minimo) totalCritico = totalCritico + 1
    else if (m.stock < m.minimo * 1.5) totalBajo = totalBajo + 1
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>MC</div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Inventario de materias primas</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ background: COLORES.verde, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: COLORES.claro, fontSize: '11px', textTransform: 'uppercase' }}>Total insumos</div>
            <div style={{ color: COLORES.amarillo, fontSize: '22px', fontWeight: 500 }}>{materias.length}</div>
          </div>
          <div style={{ background: '#C0321A', borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#ffd0c8', fontSize: '11px', textTransform: 'uppercase' }}>Stock critico</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{totalCritico}</div>
          </div>
          <div style={{ background: COLORES.dorado, borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#fff8e0', fontSize: '11px', textTransform: 'uppercase' }}>Stock bajo</div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 500 }}>{totalBajo}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd8cc', borderRadius: '12px', padding: '0.9rem 1rem' }}>
            <div style={{ color: '#7A7060', fontSize: '11px', textTransform: 'uppercase' }}>En nivel normal</div>
            <div style={{ color: COLORES.verde2, fontSize: '22px', fontWeight: 500 }}>{materias.length - totalCritico - totalBajo}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>
              <IconDroplet size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Materias primas
            </strong>
            <button onClick={abrirNuevo} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconPlus size={14} /> Registrar entrada
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#FAF6EE' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Insumo</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Stock actual</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Minimo</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Proveedor</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#7A7060', textTransform: 'uppercase' }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {materias.map(function (m) {
                const nivel = nivelStock(m.stock, m.minimo)
                const pct = Math.min(Math.round((m.stock / (m.minimo * 2)) * 100), 100)
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f0e8d8' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.nombre}</td>
                    <td style={{ padding: '10px 12px', color: '#7A7060' }}>{m.categoria}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 500, color: nivel.color }}>{m.stock} {m.unidad}</span>
                        <div style={{ width: '60px', background: '#E8E0D0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: nivel.color, borderRadius: '999px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#7A7060' }}>{m.minimo} {m.unidad}</td>
                    <td style={{ padding: '10px 12px', color: '#7A7060', fontSize: '11px' }}>{m.proveedor}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', background: nivel.color + '22', color: nivel.color }}>
                        {nivel.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={function () { abrirEditar(m) }} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', color: '#5A5040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconEdit size={12} /> Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Registrar entrada</h3>
              <button onClick={function () { setModalAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <label style={labelStyle}>Materia prima *</label>
            <select style={inputStyle} value={materiaId} onChange={function (e) { setMateriaId(e.target.value) }}>
              <option value="">Seleccionar...</option>
              {materias.map(function (m) {
                return <option key={m.id} value={m.id}>{m.nombre} ({m.stock} {m.unidad})</option>
              })}
            </select>

            <label style={labelStyle}>Cantidad a agregar</label>
            <input type="number" style={inputStyle} value={cantidad} onChange={function (e) { setCantidad(parseFloat(e.target.value) || 0) }} />

            <label style={labelStyle}>Responsable</label>
            <input style={inputStyle} value={responsable} onChange={function (e) { setResponsable(e.target.value) }} />

            <label style={labelStyle}>Fecha</label>
            <input type="date" style={inputStyle} value={fecha} onChange={function (e) { setFecha(e.target.value) }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
              <button onClick={function () { setModalAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEntrada} disabled={guardando} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? 'Guardando...' : 'Registrar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>Editar materia prima</h3>
              <button onClick={function () { setModalEditar(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={editNombre} onChange={function (e) { setEditNombre(e.target.value) }} />

            <label style={labelStyle}>Categoria</label>
            <input style={inputStyle} value={editCategoria} onChange={function (e) { setEditCategoria(e.target.value) }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Stock actual</label>
                <input type="number" style={inputStyle} value={editStock} onChange={function (e) { setEditStock(parseFloat(e.target.value) || 0) }} />
              </div>
              <div>
                <label style={labelStyle}>Unidad</label>
                <select style={inputStyle} value={editUnidad} onChange={function (e) { setEditUnidad(e.target.value) }}>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="pzas">pzas</option>
                </select>
              </div>
            </div>

            <label style={labelStyle}>Stock minimo</label>
            <input type="number" style={inputStyle} value={editMinimo} onChange={function (e) { setEditMinimo(parseFloat(e.target.value) || 0) }} />

            <label style={labelStyle}>Proveedor</label>
            <input style={inputStyle} value={editProveedor} onChange={function (e) { setEditProveedor(e.target.value) }} />

            <div style={{ background: '#FFF0CC', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '11px', color: '#8A5A00' }}>
              Si cambias el stock manualmente, se registrará como un ajuste en el historial de movimientos.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
              <button onClick={function () { setModalEditar(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardandoEdicion} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardandoEdicion ? 0.6 : 1 }}>
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventario  
