import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ewiwprhhrbiydccfqeoy.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Dc0slfg2xNY1T_j0AUNOXA_8-xlimwQ';

export const supabase = createClient(url, key);
