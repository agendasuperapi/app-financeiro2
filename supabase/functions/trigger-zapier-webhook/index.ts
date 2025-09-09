import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { webhookUrl, transactionData } = await req.json();

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Webhook URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare the payload to send to Zapier
    const zapierPayload = {
      timestamp: new Date().toISOString(),
      triggered_from: 'PoupeJa_App',
      transaction: {
        type: transactionData.type,
        description: transactionData.description,
        amount: transactionData.amount,
        category: transactionData.category,
        scheduledDate: transactionData.scheduledDate,
        recurrence: transactionData.recurrence,
        reference_code: transactionData.reference_code,
        phone: transactionData.phone
      }
    };

    console.log('Triggering Zapier webhook:', webhookUrl);
    console.log('Payload:', zapierPayload);

    // Call the Zapier webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapierPayload),
    });

    if (response.ok) {
      console.log('Zapier webhook triggered successfully');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook triggered successfully' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('Failed to trigger Zapier webhook:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to trigger webhook', 
          status: response.status,
          statusText: response.statusText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error triggering Zapier webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});