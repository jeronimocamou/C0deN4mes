import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('word_packs').select('name')

  if (error) return <p>Error: {error.message}</p>

  return (
    <main>
      <h1>c0den4mes</h1>
      <p>Connected to Supabase ✅</p>
      <p>Word pack: {data?.[0]?.name}</p>
    </main>
  )
 }