import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase env değişkenleri eksik: VITE_SUPABASE_URL / VITE_SUPABASE_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
