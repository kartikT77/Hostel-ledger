import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hsphldiarpvzbtuczezz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t4Ub7itzCCXs5vjmDm3XhQ_VKkVtYq1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
