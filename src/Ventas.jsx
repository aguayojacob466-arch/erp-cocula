import { useLayoutEffect } from 'react'
import { useRol } from './RolContext'

// Dashboard de Ventas 2026 (importa el Excel de facturacion). Es una pagina
// independiente en public/dashboard-ventas.html que se muestra aqui en un marco.
function Ventas() {
  const { esAdmin } = useRol()

  // La pagina lee el rol del ERP (en vez de pedir su propia contrasena).
  // Se fija antes de que los scripts del marco se ejecuten.
  useLayoutEffect(function () {
    window.__ERP_ROL = esAdmin ? 'admin' : 'consultor'
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
