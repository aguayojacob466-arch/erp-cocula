import { useState } from 'react'
import { supabase } from './supabaseClient'

const inputStyle = {
  width: '100%', fontSize: '16px', border: '1px solid #DCE5F3', borderRadius: '8px',
  padding: '10px 12px', background: '#fff', color: '#0F1F3D', outline: 'none', marginBottom: '14px',
  boxSizing: 'border-box'
}

function traducirError(mensaje) {
  if (/invalid login credentials/i.test(mensaje)) return 'Correo o contraseña incorrectos'
  if (/email not confirmed/i.test(mensaje)) return 'Tu correo aun no esta confirmado'
  if (/rate limit|too many/i.test(mensaje)) return 'Demasiados intentos, espera un momento'
  return mensaje
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setEntrando(true)
    const resp = await supabase.auth.signInWithPassword({ email: email.trim(), password: password })
    setEntrando(false)
    if (resp.error) setError(traducirError(resp.error.message))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'inherit' }}>
      <form onSubmit={entrar} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #DCE5F3', padding: '2rem', width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <img src="/logo.svg" alt="Jabones Ibarra" style={{ height: '44px', width: 'auto', display: 'block' }} />
          <div>
            <div style={{ color: '#0B2A5B', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.01em' }}>Maquiladora de Cocula</div>
            <div style={{ color: '#5A6B88', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Iniciar sesion</div>
          </div>
        </div>

        <label style={{ fontSize: '11px', color: '#5A6B88', display: 'block', marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase' }}>Correo</label>
        <input type="email" required autoComplete="username" style={inputStyle} value={email} onChange={function (e) { setEmail(e.target.value) }} />

        <label style={{ fontSize: '11px', color: '#5A6B88', display: 'block', marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase' }}>Contraseña</label>
        <input type="password" required autoComplete="current-password" style={inputStyle} value={password} onChange={function (e) { setPassword(e.target.value) }} />

        {error && (
          <div role="alert" style={{ background: '#FDE7EA', color: '#B01E32', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginBottom: '14px' }}>{error}</div>
        )}

        <button type="submit" disabled={entrando} style={{ width: '100%', fontSize: '14px', padding: '10px', borderRadius: '8px', border: 'none', background: '#0B2A5B', color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: entrando ? 0.6 : 1 }}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default Login
