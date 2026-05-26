import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kbqomjfotufnugdokefh.supabase.co',
  'sb_publishable_MzeBgqZlMpkKdP_FirdFHg_qCHUPOtI'  
)

export default supabase