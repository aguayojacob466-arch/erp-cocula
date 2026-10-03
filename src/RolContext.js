import { createContext, useContext } from 'react'

// esAdmin: solo controla que botones se ven. La seguridad real la imponen
// las politicas RLS de Supabase (ver supabase/auth.sql).
export const RolContext = createContext({ esAdmin: false })

export function useRol() {
  return useContext(RolContext)
}
