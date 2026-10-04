import { useLayoutEffect } from 'react'
import { supabase } from './supabaseClient'
import { useRol } from './RolContext'

// Dashboard de Ventas 2026 (importa el Excel de facturacion). Es una pagina
// independiente en public/dashboard-ventas.html que se muestra aqui en un marco.
function Ventas() {
  const { esAdmin } = useRol()

  // La pagina usa la sesion del ERP: su rol (en vez de pedir contrasena propia)
  // y el cliente de Supabase para guardar/leer los datos compartidos en vivo.
  // Solo la pagina del mismo origen puede leerlos. Se fija antes de que el marco ejecute scripts.
  useLayoutEffect(function () {
    window.__ERP_ROL = esAdmin ? 'admin' : 'consultor'
    window.__ERP_SUPABASE = supabase
  }, [esAdmin])

  return (
    <iframe
      title="Dashboard de Ventas 2026"
      src="/dashboard-ventas.html"
      style={{ width: '100%', height: 'calc(100vh - 44px)', border: 'none', display: 'block' }}
    />
  )
}

export default Ventas
