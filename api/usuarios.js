// Gestion de usuarios (solo administradores). Corre en el servidor de Vercel porque
// crear/borrar usuarios requiere la clave de servicio de Supabase, que nunca debe
// llegar al navegador.
//
// Variable de entorno requerida en Vercel (SIN prefijo VITE_, tipo Secret):
//   SUPABASE_SERVICE_ROLE_KEY
//
//   POST   { email, password, rol }   crea un usuario
//   PATCH  { id, rol?, password? }    cambia su rol y/o contrasena
//   DELETE { id }                     elimina el usuario
import { createClient } from '@supabase/supabase-js'

const ROLES = ['admin', 'usuario']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function traducir(mensaje) {
  if (/already (been )?registered|already exists/i.test(mensaje)) return 'Ese correo ya esta registrado'
  if (/password/i.test(mensaje) && /(least|short|weak)/i.test(mensaje)) return 'La contraseña es muy debil (minimo 6 caracteres)'
  return mensaje
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !claveServicio) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel > Settings > Environment Variables).' })
  }

  const admin = createClient(url, claveServicio, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1) Quien llama debe tener sesion y ser administrador.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Inicia sesion para continuar' })

  const sesion = await admin.auth.getUser(token)
  if (sesion.error || !sesion.data.user) return res.status(401).json({ error: 'Sesion no valida' })
  const yo = sesion.data.user

  const perfil = await admin.from('perfiles').select('rol').eq('id', yo.id).maybeSingle()
  if (perfil.error || !perfil.data || perfil.data.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede gestionar usuarios' })
  }

  const body = req.body || {}

  // 2) Acciones
  if (req.method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const rol = body.rol || 'usuario'
    if (!EMAIL.test(email)) return res.status(400).json({ error: 'Escribe un correo valido' })
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol no valido' })

    const alta = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (alta.error) return res.status(400).json({ error: traducir(alta.error.message) })

    // El perfil lo crea un trigger con rol 'usuario'; aqui se fija el rol elegido.
    const fijar = await admin.from('perfiles').upsert({ id: alta.data.user.id, email, rol })
    if (fijar.error) return res.status(500).json({ error: 'El usuario se creo pero no se pudo asignar su rol: ' + fijar.error.message })
    return res.status(201).json({ id: alta.data.user.id, email, rol })
  }

  if (req.method === 'PATCH') {
    const id = body.id
    if (!id) return res.status(400).json({ error: 'Falta el usuario' })

    if (body.rol !== undefined) {
      if (!ROLES.includes(body.rol)) return res.status(400).json({ error: 'Rol no valido' })
      if (id === yo.id && body.rol !== 'admin') return res.status(400).json({ error: 'No puedes quitarte a ti mismo el rol de administrador' })
      const cambio = await admin.from('perfiles').update({ rol: body.rol }).eq('id', id)
      if (cambio.error) return res.status(500).json({ error: cambio.error.message })
    }
    if (body.password !== undefined) {
      if (String(body.password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      const clave = await admin.auth.admin.updateUserById(id, { password: String(body.password) })
      if (clave.error) return res.status(400).json({ error: traducir(clave.error.message) })
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const id = body.id
    if (!id) return res.status(400).json({ error: 'Falta el usuario' })
    if (id === yo.id) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' })
    const baja = await admin.auth.admin.deleteUser(id)
    if (baja.error) return res.status(400).json({ error: baja.error.message })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'POST, PATCH, DELETE')
  return res.status(405).json({ error: 'Metodo no permitido' })
}
