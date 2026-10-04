import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const COLORES = { navy: '#0B2A5B', azul: '#1F5FBF', rojo: '#D7263D', hielo: '#EAF1FB', borde: '#DCE5F3', texto: '#0F1F3D', suave: '#5A6B88' }

const ROLES = [
  { id: 'admin', nombre: 'Administrador', detalle: 'Importa y exporta datos, y gestiona usuarios.' },
  { id: 'usuario', nombre: 'Usuario', detalle: 'Solo consulta. No puede importar ni exportar.' },
]

const campo = {
  width: '100%', fontSize: '14px', border: '1px solid ' + COLORES.borde, borderRadius: '8px',
  padding: '9px 12px', background: '#fff', color: COLORES.texto, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
}
const etiqueta = { fontSize: '11px', color: COLORES.suave, display: 'block', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }

// Las acciones de usuarios viven en /api/usuarios (servidor de Vercel), porque crear o
// borrar cuentas requiere una clave que no puede estar en el navegador.
async function llamarApi(metodo, cuerpo) {
  const sesion = await supabase.auth.getSession()
  const token = sesion.data.session ? sesion.data.session.access_token : ''
  let resp
  try {
    resp = await fetch('/api/usuarios', {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(cuerpo)
    })
  } catch (e) {
    throw new Error('No se pudo contactar al servidor', { cause: e })
  }
  let datos = null
  try { datos = await resp.json() } catch { /* respuesta sin JSON */ }
  if (!resp.ok) {
    if (!datos) throw new Error('El servicio de usuarios solo funciona en el sitio publicado (Vercel), no en local.')
    throw new Error(datos.error || 'Error ' + resp.status)
  }
  return datos
}

function Usuarios({ miId }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'error', texto }

  const [mostrarForm, setMostrarForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('usuario')
  const [verClave, setVerClave] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [ocupado, setOcupado] = useState('') // id del usuario con una accion en curso

  async function cargar() {
    const resp = await supabase.from('perfiles').select('id,email,rol,created_at').order('created_at', { ascending: true })
    setErrorCarga(resp.error ? resp.error.message : '')
    setLista(resp.data || [])
    setCargando(false)
  }

  useEffect(function () {
    cargar()
  }, [])

  function mostrar(tipo, texto) {
    setAviso({ tipo: tipo, texto: texto })
  }

  async function agregar(e) {
    e.preventDefault()
    setAviso(null)
    setGuardando(true)
    try {
      await llamarApi('POST', { email: email.trim(), password: password, rol: rol })
      mostrar('ok', 'Usuario ' + email.trim() + ' creado. Ya puede iniciar sesion.')
      setEmail('')
      setPassword('')
      setRol('usuario')
      setMostrarForm(false)
      cargar()
    } catch (err) {
      mostrar('error', err.message)
    }
    setGuardando(false)
  }

  async function cambiarRol(u, nuevoRol) {
    setAviso(null)
    setOcupado(u.id)
    try {
      await llamarApi('PATCH', { id: u.id, rol: nuevoRol })
      mostrar('ok', u.email + ' ahora es ' + (nuevoRol === 'admin' ? 'administrador' : 'usuario') + '.')
      cargar()
    } catch (err) {
      mostrar('error', err.message)
    }
    setOcupado('')
  }

  async function cambiarClave(u) {
    const nueva = window.prompt('Nueva contraseña para ' + u.email + ' (minimo 6 caracteres):')
    if (nueva === null) return
    setAviso(null)
    setOcupado(u.id)
    try {
      await llamarApi('PATCH', { id: u.id, password: nueva })
      mostrar('ok', 'Contraseña de ' + u.email + ' actualizada.')
    } catch (err) {
      mostrar('error', err.message)
    }
    setOcupado('')
  }

  async function eliminar(u) {
    if (!window.confirm('Eliminar a ' + u.email + '?\n\nYa no podra iniciar sesion. No se puede deshacer.')) return
    setAviso(null)
    setOcupado(u.id)
    try {
      await llamarApi('DELETE', { id: u.id })
      mostrar('ok', u.email + ' eliminado.')
      cargar()
    } catch (err) {
      mostrar('error', err.message)
    }
    setOcupado('')
  }

  const boton = { fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid ' + COLORES.borde, background: '#fff', color: COLORES.texto, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }

  return (
    <div style={{ padding: '1.5rem 2rem 2.5rem', fontFamily: 'inherit', color: COLORES.texto }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>Usuarios</h2>
          <p style={{ margin: '4px 0 0', color: COLORES.suave, fontSize: '14px' }}>Quien puede entrar y que puede hacer.</p>
        </div>
        <button
          onClick={function () { setMostrarForm(!mostrarForm); setAviso(null) }}
          style={{ fontSize: '14px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: COLORES.navy, color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
        >
          {mostrarForm ? 'Cancelar' : 'Agregar usuario'}
        </button>
      </div>

      {aviso && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '14px', background: aviso.tipo === 'ok' ? COLORES.hielo : '#FDE7EA', color: aviso.tipo === 'ok' ? COLORES.navy : '#B01E32' }}>
          {aviso.texto}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={agregar} style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 2px rgba(11,42,91,.06), 0 10px 26px -10px rgba(11,42,91,.14)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Nuevo usuario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={etiqueta} htmlFor="u-email">Correo</label>
              <input id="u-email" type="email" required autoComplete="off" style={campo} value={email} onChange={function (e) { setEmail(e.target.value) }} placeholder="nombre@empresa.com" />
            </div>
            <div>
              <label style={etiqueta} htmlFor="u-pass">Contraseña (minimo 6)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input id="u-pass" type={verClave ? 'text' : 'password'} required minLength={6} autoComplete="new-password" style={campo} value={password} onChange={function (e) { setPassword(e.target.value) }} />
                <button type="button" onClick={function () { setVerClave(!verClave) }} style={boton}>{verClave ? 'Ocultar' : 'Ver'}</button>
              </div>
            </div>
            <div>
              <label style={etiqueta} htmlFor="u-rol">Permisos</label>
              <select id="u-rol" style={campo} value={rol} onChange={function (e) { setRol(e.target.value) }}>
                {ROLES.map(function (r) { return <option key={r.id} value={r.id}>{r.nombre}</option> })}
              </select>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: COLORES.suave, margin: '12px 0 0' }}>
            {ROLES.find(function (r) { return r.id === rol }).detalle}
          </p>
          <div style={{ marginTop: '14px' }}>
            <button type="submit" disabled={guardando} style={{ fontSize: '14px', padding: '9px 20px', borderRadius: '8px', border: 'none', background: COLORES.azul, color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', opacity: guardando ? 0.6 : 1 }}>
              {guardando ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: '14px', overflow: 'auto', boxShadow: '0 1px 2px rgba(11,42,91,.06), 0 10px 26px -10px rgba(11,42,91,.14)' }}>
        {cargando ? (
          <p style={{ padding: '1.25rem', margin: 0 }}>Cargando usuarios...</p>
        ) : errorCarga ? (
          <p style={{ padding: '1.25rem', margin: 0, color: '#B01E32' }}>No se pudieron cargar los usuarios: {errorCarga}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: COLORES.hielo }}>
                {['Correo', 'Permisos', 'Creado', ''].map(function (t, i) {
                  return <th key={i} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', color: COLORES.navy, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {lista.map(function (u) {
                const soyYo = u.id === miId
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #EDF2FA' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {u.email}{soyYo && <span style={{ marginLeft: '8px', fontSize: '11px', color: COLORES.suave, fontWeight: 600 }}>(tu)</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        aria-label={'Permisos de ' + u.email}
                        value={u.rol}
                        disabled={soyYo || ocupado === u.id}
                        onChange={function (e) { cambiarRol(u, e.target.value) }}
                        style={Object.assign({}, campo, { width: 'auto', padding: '6px 10px', fontSize: '13px', fontWeight: 700, color: u.rol === 'admin' ? COLORES.rojo : COLORES.azul })}
                      >
                        {ROLES.map(function (r) { return <option key={r.id} value={r.id}>{r.nombre}</option> })}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', color: COLORES.suave }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : ''}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button disabled={ocupado === u.id} onClick={function () { cambiarClave(u) }} style={Object.assign({}, boton, { marginRight: '6px' })}>Cambiar contraseña</button>
                      {!soyYo && (
                        <button disabled={ocupado === u.id} onClick={function () { eliminar(u) }} style={Object.assign({}, boton, { color: '#B01E32', borderColor: '#F3C3CA' })}>Eliminar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {ROLES.map(function (r) {
          return (
            <div key={r.id} style={{ background: '#fff', borderRadius: '14px', padding: '1rem 1.25rem', boxShadow: '0 1px 2px rgba(11,42,91,.06)' }}>
              <div style={{ fontWeight: 800, color: r.id === 'admin' ? COLORES.rojo : COLORES.azul }}>{r.nombre}</div>
              <div style={{ fontSize: '13px', color: COLORES.suave, marginTop: '2px' }}>{r.detalle}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Usuarios
