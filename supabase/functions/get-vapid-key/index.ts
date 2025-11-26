import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  
  return new Response(
    JSON.stringify({ publicKey }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
