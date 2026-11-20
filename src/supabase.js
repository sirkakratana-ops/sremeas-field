import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ousdmycglvhneougezet.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_v2OvpeRsH7iVOU2C_reDzQ_C8f1IPcB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
