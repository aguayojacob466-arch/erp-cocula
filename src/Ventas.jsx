// Dashboard de Ventas 2026 (importa el Excel de facturacion). Es una pagina
// independiente en public/dashboard-ventas.html, con su propio diseno, y se
// muestra aqui sin modificarla.
function Ventas() {
  return (
    <iframe
      title="Dashboard de Ventas 2026"
      src="/dashboard-ventas.html"
      style={{ width: '100%', height: 'calc(100vh - 46px)', border: 'none', display: 'block' }}
    />
  )
}

export default Ventas
