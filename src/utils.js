// Fecha de hoy en hora LOCAL (YYYY-MM-DD). toISOString() devuelve UTC y en
// Mexico, despues de las 6 pm, daria la fecha de mañana.
export function hoy() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + mes + '-' + dia
}

// Primer error de una lista de respuestas de supabase, o ''.
export function primerError() {
  for (let i = 0; i < arguments.length; i++) {
    if (arguments[i] && arguments[i].error) return arguments[i].error.message
  }
  return ''
}
