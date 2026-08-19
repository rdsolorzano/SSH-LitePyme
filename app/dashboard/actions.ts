'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function seleccionarEmpresa(formData: FormData) {
  const empresaId = formData.get('empresaId') as string
  const cookieStore = await cookies()
  cookieStore.set('empresa_activa', empresaId)
  redirect('/dashboard')
}

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}