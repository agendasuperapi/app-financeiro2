import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

console.log('🔑 get-vapid-key function iniciada');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight request respondido');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    
    if (!publicKey) {
      console.error('❌ VAPID_PUBLIC_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'VAPID_PUBLIC_KEY não configurada nos secrets' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Chave VAPID pública retornada com sucesso');
    
    return new Response(
      JSON.stringify({ publicKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro ao buscar chave VAPID:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
