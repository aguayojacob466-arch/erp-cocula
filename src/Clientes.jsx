import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconUsers, IconPhone, IconMail, IconBuildingStore, IconActivity, IconPlus, IconX, IconEdit, IconCheck, IconTrash } from '@tabler/icons-react'

const COLORES = {
  verde: '#1A3A2A',
  verde2: '#2E6B4A',
  dorado: '#C8860A',
  amarillo: '#F0C84A',
  crema: '#F5F0E8',
  claro: '#A8D5B8',
}

function saludBadge(salud) {
  const colores = {
    activo: { bg: '#D4F0E2', text: '#1A5C37', label: 'Activo' },
    riesgo: { bg: '#FFF0CC', text: '#8A5A00', label: 'En riesgo' },
    inactivo: { bg: '#FFE0DB', text: '#C0321A', label: 'Inactivo' },
  }
  const c = colores[salud] || colores.activo
  return (
    <span style={{
      background: c.bg, color: c.text, fontSize: '11px', fontWeight: 500,
      padding: '3px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center'
    }}>
      {c.label}
    </span>
  )
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

const FORM_VACIO = {
  nombre: '', nombre_comercial: '', rfc: '', tipo: 'cadena', ciudad: '',
  iniciales: '', color: '#2E6B4A', frecuencia: 'Semanal', dias_credito: 90,
  factoraje: false, descuento_logistica: 0, minimo_compra: 0,
  marca_blanca: true, nombre_marca: '', politica_faltantes: 'reprograma', salud: 'activo'
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [clienteSel, setClienteSel] = useState(null)
  const [contactos, setContactos] = useState([])
  const [actividades, setActividades] = useState([])
  const [tab, setTab] = useState('datos')
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)

  useEffect(() => {
    obtenerClientes()
  }, [])

  async function obtenerClientes() {
    const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    else setClientes(data)
    setCargando(false)
  }

  async function verPerfil(cliente) {
    setClienteSel(cliente)
    setTab('datos')
    const { data: cont } = await supabase.from('contactos').select('*').eq('cliente_id', cliente.id)
    setContactos(cont || [])
    const { data: act } = await supabase.from('actividades').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: false })
    setActividades(act || [])
  }

  function actualizarForm(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function generarIniciales(nombre) {
    if (!nombre) return ''
    const palabras = nombre.trim().split(' ').filter(Boolean)
    return palabras.length >= 2 ? (palabras[0][0] + palabras[1][0]).toUpperCase() : nombre.substring(0, 2).toUpperCase()
  }

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setModoEdicion(false)
    setModalAbierto(true)
  }

  function abrirEdicion(cliente) {
    setForm({
      nombre: cliente.nombre || '',
      nombre_comercial: cliente.nombre_comercial || '',
      rfc: cliente.rfc || '',
      tipo: cliente.tipo || 'cadena',
      ciudad: cliente.ciudad || '',
      iniciales: cliente.iniciales || '',
      color: cliente.color || '#2E6B4A',
      frecuencia: cliente.frecuencia || 'Semanal',
      dias_credito: cliente.dias_credito || 90,
      factoraje: cliente.factoraje || false,
      descuento_logistica: cliente.descuento_logistica || 0,
      minimo_compra: cliente.minimo_compra || 0,
      marca_blanca: cliente.marca_blanca ?? true,
      nombre_marca: cliente.nombre_marca || '',
      politica_faltantes: cliente.politica_faltantes || 'reprograma',
      salud: cliente.salud || 'activo'
    })
    setModoEdicion(true)
    setModalAbierto(true)
  }

  async function guardarCliente() {
    if (!form.nombre.trim()) {
      alert('El nombre del cliente es obligatorio')
      return
    }
    setGuardando(true)
    const iniciales = form.iniciales || generarIniciales(form.nombre)
    const datosFinales = { ...form, iniciales }

    try {
      if (modoEdicion && clienteSel) {
        const { data, error } = await supabase
          .from('clientes')
          .update(datosFinales)
          .eq('id', clienteSel.id)
          .select()
          .single()

        if (error) throw error

        setClienteSel(data)
        setClientes(prev => prev.map(c => c.id === data.id ? data : c))
      } else {
        const { data, error } = await supabase
          .from('clientes')
          .insert([datosFinales])
          .select()
          .single()

        if (error) throw error

        setClientes(prev => [data, ...prev])
      }

      setModalAbierto(false)
    } catch (err) {
      alert('Error al guardar: ' + err.message)
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarCliente(cliente) {
    const confirmar = window.confirm(`¿Seguro que quieres eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`)
    if (!confirmar) return

    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
      console.error(error)
      return
    }

    setClientes(prev => prev.filter(c => c.id !== cliente.id))
    setClienteSel(null)
  }

  if (cargando) return <p style={{ padding: '2rem' }}>Cargando clientes...</p>

  const tabBtn = (id, label, Icon) => (
    <button
      onClick={() => setTab(id)}
      style={{
        fontSize: '12px', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
        color: tab === id ? COLORES.verde : '#7A7060', fontWeight: 500,
        borderBottom: tab === id ? `2px solid ${COLORES.verde}` : '2px solid transparent'
      }}
    >
      <Icon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{label}
    </button>
  )

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500
        }}>MC</div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>CRM · Clientes</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden', height: 'fit-content' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}><IconUsers size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Clientes</strong>
            <button
              onClick={abrirNuevo}
              style={{
                fontSize: '11px', padding: '5px 10px', borderRadius: '8px', border: 'none',
                background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <IconPlus size={13} /> Nuevo
            </button>
          </div>
          {clientes.length === 0 ? (
            <p style={{ padding: '1rem', fontSize: '13px', color: '#7A7060' }}>No hay clientes registrados.</p>
          ) : (
            clientes.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => verPerfil(cliente)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem',
                  borderBottom: '1px solid #f0e8d8', cursor: 'pointer',
                  background: clienteSel?.id === cliente.id ? '#F0FAF4' : 'transparent'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: cliente.color || COLORES.verde2,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, flexShrink: 0
                }}>
                  {cliente.iniciales || cliente.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cliente.nombre_comercial || cliente.nombre}
                  </div>
                  <div style={{ fontSize: '11px', color: '#7A7060' }}>{cliente.frecuencia}</div>
                </div>
                {saludBadge(cliente.salud)}
              </div>
            ))
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          {!clienteSel ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#7A7060', fontSize: '13px' }}>
              Selecciona un cliente para ver su perfil
            </div>
          ) : (
            <>
              <div style={{ background: clienteSel.color || COLORES.verde2, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 500
                }}>
                  {clienteSel.iniciales || clienteSel.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '15px', fontWeight: 500 }}>{clienteSel.nombre}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', marginTop: '2px' }}>
                    {clienteSel.frecuencia} · {clienteSel.dias_credito} días crédito · Desc. log. {clienteSel.descuento_logistica}%
                  </div>
                </div>
                {saludBadge(clienteSel.salud)}
                <button
                  onClick={() => abrirEdicion(clienteSel)}
                  title="Editar cliente"
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                    padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'
                  }}
                >
                  <IconEdit size={14} /> Editar
                </button>
                <button
                  onClick={() => eliminarCliente(clienteSel)}
                  title="Eliminar cliente"
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                    padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginLeft: '6px'
                  }}
                >
                  <IconTrash size={14} /> Eliminar
                </button>
              </div>

              <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #e8e0d0', background: '#FAF6EE', padding: '0 1rem' }}>
                {tabBtn('datos', 'Datos', IconBuildingStore)}
                {tabBtn('contactos', 'Contactos', IconPhone)}
                {tabBtn('actividades', 'Actividades', IconActivity)}
              </div>

              <div style={{ padding: '1rem 1.25rem' }}>
                {tab === 'datos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      ['Marca', clienteSel.nombre_marca || '—'],
                      ['Factoraje', clienteSel.factoraje ? 'Sí aplica' : 'No aplica'],
                      ['Días de crédito', `${clienteSel.dias_credito} días`],
                      ['Desc. logística', `${clienteSel.descuento_logistica}%`],
                      ['Mínimo de compra', `$${clienteSel.minimo_compra?.toLocaleString() || 0}`],
                      ['Ciudad', clienteSel.ciudad || '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'contactos' && (
                  <div>
                    {contactos.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#7A7060' }}>Sin contactos registrados.</p>
                    ) : (
                      contactos.map((c) => (
                        <div key={c.id} style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.75rem', marginBottom: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.nombre}</div>
                          <div style={{ fontSize: '11px', color: '#7A7060', marginTop: '2px' }}>{c.puesto}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {tab === 'actividades' && (
                  <div>
                    {actividades.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#7A7060' }}>Sin actividades registradas.</p>
                    ) : (
                      actividades.map((a) => (
                        <div key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0e8d8' }}>
                          <div style={{ fontSize: '12px', color: '#3A3020' }}>{a.descripcion}</div>
                          <div style={{ fontSize: '10px', color: '#7A7060', marginTop: '2px' }}>{a.tipo} · {a.fecha}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL NUEVO / EDITAR CLIENTE */}
      {modalAbierto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: `2px solid ${COLORES.dorado}` }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>
                {modoEdicion ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px 24px' }}>

              {/* COLUMNA IZQUIERDA */}
              <div>
                <label style={labelStyle}>Nombre / Razón social *</label>
                <input style={inputStyle} value={form.nombre} onChange={e => actualizarForm('nombre', e.target.value)} placeholder="Ej. Walmart de México S.A. de C.V." />

                <label style={labelStyle}>Nombre comercial</label>
                <input style={inputStyle} value={form.nombre_comercial} onChange={e => actualizarForm('nombre_comercial', e.target.value)} placeholder="Ej. Walmart" />

                <label style={labelStyle}>Iniciales del avatar (2 letras)</label>
                <input
                  style={{ ...inputStyle, maxWidth: '100px', textTransform: 'uppercase' }}
                  value={form.iniciales}
                  onChange={e => actualizarForm('iniciales', e.target.value.substring(0, 2).toUpperCase())}
                  placeholder="Ej. WM"
                  maxLength={2}
                  autoComplete="off"
                />

                <label style={labelStyle}>Color del avatar</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {['#0071CE', '#E30613', '#FF6600', '#004A97', '#2E6B4A', '#7F77DD', '#C8860A', '#1D9E75'].map(c => (
                    <div
                      key={c}
                      onClick={() => actualizarForm('color', c)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer',
                        border: form.color === c ? '3px solid #1A3A2A' : '2px solid transparent'
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '8px', background: '#FAF6EE', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#7A7060' }}>Vista previa:</span>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: form.color,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500
                  }}>
                    {form.iniciales || generarIniciales(form.nombre) || '—'}
                  </div>
                </div>

                <label style={labelStyle}>RFC</label>
                <input style={inputStyle} value={form.rfc} onChange={e => actualizarForm('rfc', e.target.value)} />

                <label style={labelStyle}>Ciudad</label>
                <input style={inputStyle} value={form.ciudad} onChange={e => actualizarForm('ciudad', e.target.value)} placeholder="Guadalajara, Jalisco" />
              </div>

              {/* COLUMNA DERECHA */}
              <div>
                <label style={labelStyle}>Frecuencia de pedido</label>
                <select style={inputStyle} value={form.frecuencia} onChange={e => actualizarForm('frecuencia', e.target.value)}>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                  <option>Variable</option>
                </select>

                <label style={labelStyle}>Días de crédito</label>
                <input type="number" style={inputStyle} value={form.dias_credito} onChange={e => actualizarForm('dias_credito', parseInt(e.target.value) || 0)} />

                <label style={labelStyle}>Desc. logística (%)</label>
                <input type="number" style={inputStyle} value={form.descuento_logistica} onChange={e => actualizarForm('descuento_logistica', parseFloat(e.target.value) || 0)} />

                <label style={labelStyle}>Mínimo de compra ($)</label>
                <input type="number" style={inputStyle} value={form.minimo_compra} onChange={e => actualizarForm('minimo_compra', parseFloat(e.target.value) || 0)} />

                <label style={labelStyle}>Nombre de marca (si aplica marca blanca)</label>
                <input style={inputStyle} value={form.nombre_marca} onChange={e => actualizarForm('nombre_marca', e.target.value)} placeholder="Ej. Great Value" />

                <label style={labelStyle}>Salud del cliente</label>
                <select style={inputStyle} value={form.salud} onChange={e => actualizarForm('salud', e.target.value)}>
                  <option value="activo">Activo</option>
                  <option value="riesgo">En riesgo</option>
                  <option value="inactivo">Inactivo</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', marginTop: '4px' }}>
                  <input type="checkbox" checked={form.factoraje} onChange={e => actualizarForm('factoraje', e.target.checked)} />
                  <span style={{ fontSize: '13px', color: '#3A3020' }}>Aplica factoraje financiero</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e8e0d0' }}>
              <button
                onClick={() => setModalAbierto(false)}
                style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarCliente}
                disabled={guardando}
                style={{
                  fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none',
                  background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500,
                  opacity: guardando ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {guardando ? 'Guardando...' : (<><IconCheck size={14} />{modoEdicion ? 'Guardar cambios' : 'Guardar cliente'}</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}