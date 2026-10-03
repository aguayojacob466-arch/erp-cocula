function ErrorCarga({ mensaje, onReintentar }) {
  return (
    <div style={{ padding: '2rem', maxWidth: '520px' }}>
      <p style={{ color: '#C0321A', fontWeight: 500, marginBottom: '8px' }}>No se pudieron cargar los datos</p>
      <p style={{ color: '#7A7060', fontSize: '13px', marginBottom: '16px' }}>{mensaje}</p>
      <button
        onClick={onReintentar}
        style={{ background: '#1A3A2A', color: '#F0C84A', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
      >
        Reintentar
      </button>
    </div>
  )
}

export default ErrorCarga
