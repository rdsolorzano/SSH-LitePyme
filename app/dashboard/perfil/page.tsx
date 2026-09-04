import { createClient } from '@/lib/supabase/server'
import PerfilForm from './perfil-form'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>No se pudo cargar tu sesión.</div>

  const nombreActual = (user.user_metadata?.full_name as string) || ''

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-[#1B2430]">Mi perfil de usuario</h1>
      <PerfilForm email={user.email || ''} nombreActual={nombreActual} />
    </>
  )
}