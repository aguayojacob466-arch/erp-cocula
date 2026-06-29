import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { IconUsers, IconPhone, IconMail, IconBuildingStore, IconActivity, IconPlus, IconX, IconEdit, IconCheck, IconTrash, IconBell } from '@tabler/icons-react'

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
    <span style={{ background: c.bg, color: c.text, fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center' }}>
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

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [clienteSel, setClienteSel] = useState(null)
  const [contactos, setContactos] = useState([])
  const [actividades, setActividades] = useState([])
  const [alertas, setAlertas] = useState([])
  const [tab, setTab] = useState('datos')
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)

  const [modalContacto, setModalContacto] = useState(false)
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoPuesto, setContactoPuesto] = useState('')
  const [contactoTel, setContactoTel] = useState('')
  const [contactoEmail, setContactoEmail] = useState('')

  const [modalActividad, setModalActividad] = useState(false)
  const [actividadTipo, setActividadTipo] = useState('llamada')
  const [actividadDescripcion, setActividadDescripcion] = useState('')
  const [actividadFecha, setActividadFecha] = useState('')

  const [modalAlerta, setModalAlerta] = useState(false)
  const [alertaTipo, setAlertaTipo] = useState('llamada')
  const [alertaNota, setAlertaNota] = useState('')
  const [alertaFecha, setAlertaFecha] = useState('')

  useEffect(function () {
    obtenerClientes()
  }, [])

  async function obtenerClientes() {
    const resp = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (resp.data) setClientes(resp.data)
    setCargando(false)
  }

  async function verPerfil(cliente) {
    setClienteSel(cliente)
    setTab('datos')
    const resCont = await supabase.from('contactos').select('*').eq('cliente_id', cliente.id)
    setContactos(resCont.data || [])
    const resAct = await supabase.from('actividades').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: false })
    setActividades(resAct.data || [])
    const resAlert = await supabase.from('alertas').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: true })
    setAlertas(resAlert.data || [])
  }

  function actualizarForm(campo, valor) {
    setForm(function (prev) {
      const copia = Object.assign({}, prev)
      copia[campo] = valor
      return copia
    })
  }

  function generarIniciales(nombre) {
    if (!nombre) return ''
    const palabras = nombre.trim().split(' ').filter(Boolean)
    if (palabras.length >= 2) return (palabras[0][0] + palabras[1][0]).toUpperCase()
    return nombre.substring(0, 2).toUpperCase()
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
      marca_blanca: true,
      nombre_marca: cliente.nombre_marca || '',
      politica_faltantes: cliente.politica_faltantes || 'reprograma',
      salud: cliente.salud || 'activo'
    })
    setModoEdicion(true)
    setModalAbierto(true)
  }

  async function guardarCliente() {
    if (!form.nombre.trim()) {
      window.alert('El nombre del cliente es obligatorio')
      return
    }
    setGuardando(true)
    const iniciales = form.iniciales || generarIniciales(form.nombre)
    const datosFinales = Object.assign({}, form, { iniciales: iniciales })

    if (modoEdicion && clienteSel) {
      const resp = await supabase.from('clientes').update(datosFinales).eq('id', clienteSel.id).select().single()
      if (resp.error) {
        window.alert('Error: ' + resp.error.message)
      } else {
        setClienteSel(resp.data)
        setClientes(function (prev) {
          return prev.map(function (c) {
            if (c.id === resp.data.id) return resp.data
            return c
          })
        })
        setModalAbierto(false)
      }
    } else {
      const resp = await supabase.from('clientes').insert([datosFinales]).select().single()
      if (resp.error) {
        window.alert('Error: ' + resp.error.message)
      } else {
        setClientes(function (prev) { return [resp.data].concat(prev) })
        setModalAbierto(false)
      }
    }
    setGuardando(false)
  }

  async function eliminarCliente(cliente) {
    const ok = window.confirm('Eliminar a ' + cliente.nombre + '?')
    if (!ok) return
    const resp = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (!resp.error) {
      setClientes(function (prev) { return prev.filter(function (c) { return c.id !== cliente.id }) })
      setClienteSel(null)
    }
  }

  function abrirModalContacto() {
    setContactoNombre('')
    setContactoPuesto('')
    setContactoTel('')
    setContactoEmail('')
    setModalContacto(true)
  }

  async function guardarContacto() {
    if (!contactoNombre.trim()) {
      window.alert('El nombre es obligatorio')
      return
    }
    const resp = await supabase.from('contactos').insert([{
      cliente_id: clienteSel.id,
      nombre: contactoNombre,
      puesto: contactoPuesto,
      telefono: contactoTel,
      email: contactoEmail
    }]).select().single()

    if (resp.error) {
      window.alert('Error: ' + resp.error.message)
      return
    }
    setContactos(function (prev) { return prev.concat([resp.data]) })
    setModalContacto(false)
  }

  function abrirModalActividad() {
    setActividadTipo('llamada')
    setActividadDescripcion('')
    setActividadFecha(new Date().toISOString().split('T')[0])
    setModalActividad(true)
  }

  async function guardarActividad() {
    if (!actividadDescripcion.trim()) {
      window.alert('Describe la actividad')
      return
    }
    const resp = await supabase.from('actividades').insert([{
      cliente_id: clienteSel.id,
      tipo: actividadTipo,
      descripcion: actividadDescripcion,
      fecha: actividadFecha
    }]).select().single()

    if (resp.error) {
      window.alert('Error: ' + resp.error.message)
      return
    }
    setActividades(function (prev) { return [resp.data].concat(prev) })
    setModalActividad(false)
  }

  function abrirModalAlerta() {
    setAlertaTipo('llamada')
    setAlertaNota('')
    setAlertaFecha(new Date().toISOString().split('T')[0])
    setModalAlerta(true)
  }

  async function guardarAlerta() {
    if (!alertaNota.trim()) {
      window.alert('Describe la alerta')
      return
    }
    const resp = await supabase.from('alertas').insert([{
      cliente_id: clienteSel.id,
      tipo: alertaTipo,
      nota: alertaNota,
      fecha: alertaFecha,
      resuelta: false
    }]).select().single()

    if (resp.error) {
      window.alert('Error: ' + resp.error.message)
      return
    }
    setAlertas(function (prev) { return prev.concat([resp.data]) })
    setModalAlerta(false)
  }

  async function resolverAlerta(alerta) {
    const resp = await supabase.from('alertas').update({ resuelta: true }).eq('id', alerta.id)
    if (!resp.error) {
      setAlertas(function (prev) {
        return prev.map(function (a) {
          if (a.id === alerta.id) return Object.assign({}, a, { resuelta: true })
          return a
        })
      })
    }
  }if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando clientes...</p>
  }

  function tabBtn(id, label, Icon, contador) {
    const activo = tab === id
    return (
      <button
        onClick={function () { setTab(id) }}
        style={{
          fontSize: '12px', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
          color: activo ? COLORES.verde : '#7A7060', fontWeight: 500,
          borderBottom: activo ? '2px solid ' + COLORES.verde : '2px solid transparent'
        }}
      >
        <Icon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{label}
        {contador > 0 && <span style={{ marginLeft: '4px', background: COLORES.dorado, color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '999px' }}>{contador}</span>}
      </button>
    )
  }

  const alertasPendientes = alertas.filter(function (a) { return !a.resuelta }).length

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: COLORES.crema }}>

      <div style={{ background: COLORES.verde, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: COLORES.dorado, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500 }}>MC</div>
        <div>
          <div style={{ color: COLORES.amarillo, fontWeight: 500, fontSize: '16px' }}>Maquiladora de Cocula</div>
          <div style={{ color: COLORES.claro, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>CRM - Clientes</div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden', height: 'fit-content' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}><IconUsers size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Clientes</strong>
            <button onClick={abrirNuevo} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconPlus size={13} /> Nuevo
            </button>
          </div>
          {clientes.length === 0 ? (
            <p style={{ padding: '1rem', fontSize: '13px', color: '#7A7060' }}>No hay clientes registrados.</p>
          ) : (
            clientes.map(function (cliente) {
              return (
                <div
                  key={cliente.id}
                  onClick={function () { verPerfil(cliente) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f0e8d8', cursor: 'pointer',
                    background: (clienteSel && clienteSel.id === cliente.id) ? '#F0FAF4' : 'transparent'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: cliente.color || COLORES.verde2, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, flexShrink: 0 }}>
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
              )
            })
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden' }}>
          {!clienteSel ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#7A7060', fontSize: '13px' }}>
              Selecciona un cliente para ver su perfil
            </div>
          ) : (
            <div>
              <div style={{ background: clienteSel.color || COLORES.verde2, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 500 }}>
                  {clienteSel.iniciales || clienteSel.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '15px', fontWeight: 500 }}>{clienteSel.nombre}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', marginTop: '2px' }}>
                    {clienteSel.frecuencia} - {clienteSel.dias_credito} dias credito - Desc. log. {clienteSel.descuento_logistica}%
                  </div>
                </div>
                {saludBadge(clienteSel.salud)}
                <button onClick={function () { abrirEdicion(clienteSel) }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <IconEdit size={14} /> Editar
                </button>
                <button onClick={function () { eliminarCliente(clienteSel) }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginLeft: '6px' }}>
                  <IconTrash size={14} /> Eliminar
                </button>
              </div>

              <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #e8e0d0', background: '#FAF6EE', padding: '0 1rem' }}>
                {tabBtn('datos', 'Datos', IconBuildingStore, 0)}
                {tabBtn('contactos', 'Contactos', IconPhone, contactos.length)}
                {tabBtn('actividades', 'Actividades', IconActivity, actividades.length)}
                {tabBtn('alertas', 'Alertas', IconBell, alertasPendientes)}
              </div>

              <div style={{ padding: '1rem 1.25rem' }}>

                {tab === 'datos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Marca</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>{clienteSel.nombre_marca || '-'}</div>
                    </div>
                    <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Factoraje</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>{clienteSel.factoraje ? 'Si aplica' : 'No aplica'}</div>
                    </div>
                    <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Dias de credito</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>{clienteSel.dias_credito} dias</div>
                    </div>
                    <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Desc. logistica</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>{clienteSel.descuento_logistica}%</div>
                    </div>
                    <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Minimo de compra</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>${clienteSel.minimo_compra ? clienteSel.minimo_compra.toLocaleString() : 0}</div>
                    </div>
                    <div style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '10px', color: '#7A7060', textTransform: 'uppercase' }}>Ciudad</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#3A3020' }}>{clienteSel.ciudad || '-'}</div>
                    </div>
                  </div>
                )}

                {tab === 'contactos' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                      <button onClick={abrirModalContacto} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: COLORES.verde2, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                        <IconPlus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Nuevo contacto
                      </button>
                    </div>
                    {contactos.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#7A7060' }}>Sin contactos registrados.</p>
                    ) : (
                      contactos.map(function (c) {
                        return (
                          <div key={c.id} style={{ background: '#FAF6EE', borderRadius: '8px', padding: '0.75rem', marginBottom: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.nombre}</div>
                            <div style={{ fontSize: '11px', color: '#7A7060', marginTop: '2px' }}>{c.puesto}</div>
                            <div style={{ fontSize: '11px', color: '#5A5040', marginTop: '4px' }}>
                              {c.telefono} {c.email ? '- ' + c.email : ''}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {tab === 'actividades' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                      <button onClick={abrirModalActividad} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: COLORES.verde2, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                        <IconPlus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Nueva actividad
                      </button>
                    </div>
                    {actividades.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#7A7060' }}>Sin actividades registradas.</p>
                    ) : (
                      actividades.map(function (a) {
                        return (
                          <div key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0e8d8' }}>
                            <div style={{ fontSize: '12px', color: '#3A3020' }}>{a.descripcion}</div>
                            <div style={{ fontSize: '10px', color: '#7A7060', marginTop: '2px' }}>{a.tipo} - {a.fecha}</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {tab === 'alertas' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                      <button onClick={abrirModalAlerta} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: COLORES.dorado, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                        <IconPlus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Nueva alerta
                      </button>
                    </div>
                    {alertas.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#7A7060' }}>Sin alertas registradas.</p>
                    ) : (
                      alertas.map(function (a) {
                        return (
                          <div key={a.id} style={{ background: a.resuelta ? '#FAF6EE' : '#FFF0CC', borderRadius: '8px', padding: '0.75rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 500, color: a.resuelta ? '#7A7060' : '#3A3020' }}>{a.nota}</div>
                              <div style={{ fontSize: '10px', color: '#7A7060', marginTop: '2px' }}>{a.tipo} - {a.fecha}</div>
                            </div>
                            {!a.resuelta && (
                              <button onClick={function () { resolverAlerta(a) }} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', border: '1px solid ' + COLORES.verde2, background: 'transparent', color: COLORES.verde2, cursor: 'pointer' }}>
                                Resolver
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90vw', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid ' + COLORES.dorado }}>
              <h3 style={{ fontSize: '17px', color: COLORES.verde, margin: 0 }}>{modoEdicion ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button onClick={function () { setModalAbierto(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7060' }}>
                <IconX size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px 24px' }}>
              <div>
                <label style={labelStyle}>Nombre / Razon social *</label>
                <input style={inputStyle} value={form.nombre} onChange={function (e) { actualizarForm('nombre', e.target.value) }} />

                <label style={labelStyle}>Nombre comercial</label>
                <input style={inputStyle} value={form.nombre_comercial} onChange={function (e) { actualizarForm('nombre_comercial', e.target.value) }} />

                <label style={labelStyle}>Iniciales (2 letras)</label>
                <input style={Object.assign({}, inputStyle, { maxWidth: '100px', textTransform: 'uppercase' })} value={form.iniciales} onChange={function (e) { actualizarForm('iniciales', e.target.value.substring(0, 2).toUpperCase()) }} maxLength={2} autoComplete="off" />

                <label style={labelStyle}>Color del avatar</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {['#0071CE', '#E30613', '#FF6600', '#004A97', '#2E6B4A', '#7F77DD', '#C8860A', '#1D9E75'].map(function (c) {
                    return (
                      <div key={c} onClick={function () { actualizarForm('color', c) }} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #1A3A2A' : '2px solid transparent' }} />
                    )
                  })}
                </div>

                <label style={labelStyle}>RFC</label>
                <input style={inputStyle} value={form.rfc} onChange={function (e) { actualizarForm('rfc', e.target.value) }} />

                <label style={labelStyle}>Ciudad</label>
                <input style={inputStyle} value={form.ciudad} onChange={function (e) { actualizarForm('ciudad', e.target.value) }} />
              </div>

              <div>
                <label style={labelStyle}>Frecuencia de pedido</label>
                <select style={inputStyle} value={form.frecuencia} onChange={function (e) { actualizarForm('frecuencia', e.target.value) }}>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                  <option>Variable</option>
                </select>

                <label style={labelStyle}>Dias de credito</label>
                <input type="number" style={inputStyle} value={form.dias_credito} onChange={function (e) { actualizarForm('dias_credito', parseInt(e.target.value) || 0) }} />

                <label style={labelStyle}>Desc. logistica (%)</label>
                <input type="number" style={inputStyle} value={form.descuento_logistica} onChange={function (e) { actualizarForm('descuento_logistica', parseFloat(e.target.value) || 0) }} />

                <label style={labelStyle}>Minimo de compra ($)</label>
                <input type="number" style={inputStyle} value={form.minimo_compra} onChange={function (e) { actualizarForm('minimo_compra', parseFloat(e.target.value) || 0) }} />

                <label style={labelStyle}>Nombre de marca</label>
                <input style={inputStyle} value={form.nombre_marca} onChange={function (e) { actualizarForm('nombre_marca', e.target.value) }} />

                <label style={labelStyle}>Salud del cliente</label>
                <select style={inputStyle} value={form.salud} onChange={function (e) { actualizarForm('salud', e.target.value) }}>
                  <option value="activo">Activo</option>
                  <option value="riesgo">En riesgo</option>
                  <option value="inactivo">Inactivo</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', marginTop: '4px' }}>
                  <input type="checkbox" checked={form.factoraje} onChange={function (e) { actualizarForm('factoraje', e.target.checked) }} />
                  <span style={{ fontSize: '13px', color: '#3A3020' }}>Aplica factoraje financiero</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e8e0d0' }}>
              <button onClick={function () { setModalAbierto(false) }} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarCliente} disabled={guardando} style={{ fontSize: '13px', padding: '8px 22px', borderRadius: '8px', border: 'none', background: COLORES.verde, color: COLORES.amarillo, cursor: 'pointer', fontWeight: 500, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? 'Guardando...' : (modoEdicion ? 'Guardar cambios' : 'Guardar cliente')}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalContacto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90vw', maxWidth: '450px' }}>
            <h3 style={{ fontSize: '15px', color: COLORES.verde, marginBottom: '1rem' }}>Nuevo contacto</h3>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={contactoNombre} onChange={function (e) { setContactoNombre(e.target.value) }} />
            <label style={labelStyle}>Puesto</label>
            <input style={inputStyle} value={contactoPuesto} onChange={function (e) { setContactoPuesto(e.target.value) }} />
            <label style={labelStyle}>Telefono</label>
            <input style={inputStyle} value={contactoTel} onChange={function (e) { setContactoTel(e.target.value) }} />
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={contactoEmail} onChange={function (e) { setContactoEmail(e.target.value) }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={function () { setModalContacto(false) }} style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarContacto} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: COLORES.verde2, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalActividad && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90vw', maxWidth: '450px' }}>
            <h3 style={{ fontSize: '15px', color: COLORES.verde, marginBottom: '1rem' }}>Nueva actividad</h3>
            <label style={labelStyle}>Tipo</label>
            <select style={inputStyle} value={actividadTipo} onChange={function (e) { setActividadTipo(e.target.value) }}>
              <option value="llamada">Llamada</option>
              <option value="visita">Visita</option>
              <option value="acuerdo">Acuerdo</option>
              <option value="otro">Otro</option>
            </select>
            <label style={labelStyle}>Descripcion *</label>
            <textarea style={Object.assign({}, inputStyle, { minHeight: '70px' })} value={actividadDescripcion} onChange={function (e) { setActividadDescripcion(e.target.value) }} />
            <label style={labelStyle}>Fecha</label>
            <input type="date" style={inputStyle} value={actividadFecha} onChange={function (e) { setActividadFecha(e.target.value) }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={function () { setModalActividad(false) }} style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarActividad} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: COLORES.verde2, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalAlerta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90vw', maxWidth: '450px' }}>
            <h3 style={{ fontSize: '15px', color: COLORES.verde, marginBottom: '1rem' }}>Nueva alerta</h3>
            <label style={labelStyle}>Tipo</label>
            <select style={inputStyle} value={alertaTipo} onChange={function (e) { setAlertaTipo(e.target.value) }}>
              <option value="llamada">Llamar al cliente</option>
              <option value="visita">Visita programada</option>
              <option value="pedido">Recordar pedido</option>
              <option value="cobro">Gestionar cobro</option>
              <option value="otro">Otro</option>
            </select>
            <label style={labelStyle}>Nota *</label>
            <textarea style={Object.assign({}, inputStyle, { minHeight: '70px' })} value={alertaNota} onChange={function (e) { setAlertaNota(e.target.value) }} />
            <label style={labelStyle}>Fecha</label>
            <input type="date" style={inputStyle} value={alertaFecha} onChange={function (e) { setAlertaFecha(e.target.value) }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={function () { setModalAlerta(false) }} style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd8cc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarAlerta} style={{ fontSize: '13px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: COLORES.dorado, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes