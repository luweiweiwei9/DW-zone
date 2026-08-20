import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnabmshzcihlzwjtwprl.supabase.co';
const supabaseAnonKey = 'sb_publishable_Wvs0AJsPFcBPMLFT4wXqMg_Mh_0rUnD'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
