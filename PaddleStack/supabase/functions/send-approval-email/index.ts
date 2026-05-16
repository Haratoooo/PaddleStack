const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    
    const { customerName, customerEmail, reference, total, slots } = await req.json()

    const itineraryHtml = slots.map((slot: any) => 
      `<li><strong>${slot.court}</strong> - ${slot.booking_date} @ ${slot.time_slot}</li>`
    ).join('')

    const htmlBody = `
      <div style="font-family: sans-serif; color: #1C1C1C; max-w-md; margin: auto;">
        <h1 style="color: #A9FC24; background: #1C1C1C; padding: 20px; border-radius: 12px;">PaddleStack Confirmed!</h1>
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Great news! Your booking has been approved by our staff.</p>
        
        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #6B6B6B;">REFERENCE CODE</p>
          <h2 style="margin: 5px 0;">${reference}</h2>
        </div>

        <h3>Your Itinerary:</h3>
        <ul>${itineraryHtml}</ul>

        <p><strong>Total Paid:</strong> ₱${total}</p>

        <p style="margin-top: 30px; font-size: 14px; color: #6B6B6B;">
          See you on the court!<br/>- The PaddleStack Team
        </p>
      </div>
    `

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'PaddleStack Admin', email: 'paddlestack.cebu@gmail.com' }, 
        to: [{ email: customerEmail }],
        subject: `Booking Confirmed: ${reference}`,
        htmlContent: htmlBody,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error: any) {
    console.error("Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})