import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    
    const payload = await req.json()
    const oldRecord = payload.old_record

    
    if (!oldRecord || !oldRecord.receipt_url) {
      return new Response("No receipt to delete", { status: 200 })
    }

    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )


    const urlParts = oldRecord.receipt_url.split('/public/receipts/')
    
    if (urlParts.length > 1) {
      const filePath = urlParts[1] 
      

      const { error } = await supabaseAdmin
        .storage
        .from('receipts')
        .remove([filePath])

      if (error) throw error
    }

    return new Response(JSON.stringify({ message: "Receipt file permanently deleted" }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (err) {
    console.error("Cleanup error:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})