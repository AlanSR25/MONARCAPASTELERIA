import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

// Inicializar Stripe usando tu Llave Secreta directa
const stripe = new Stripe('sk_test_51TPahtRsVtPB8IQxEnIGESOQYH0U1ybbAEYv7gAbkAM1AU9YgoFGde2HpStSfmg02EYE9VdY7uM1rrrzDhEZZBUI005FcJfv36', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Usamos el rol de administrador para asegurar que pueda guardar el pago sin que la seguridad lo bloquee
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const payload = await req.json()
    const action = payload.action || 'crear_sesion';

    // ==========================================
    // 1. VERIFICAR UN PAGO COMPLETADO
    // ==========================================
    if (action === 'verificar_pago') {
      const session_id = payload.session_id;
      if (!session_id) throw new Error("Falta session_id");

      // Consultar la sesión real directamente en Stripe (A prueba de hackers)
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status !== 'paid') {
        throw new Error("El pago en Stripe aún no está marcado como exitoso.");
      }

      const id_pedido = session.metadata?.id_pedido;
      const abono = parseFloat(session.metadata?.monto_pagado || "0");

      if (!id_pedido || abono <= 0) throw new Error("Metadatos inválidos en la sesión de Stripe.");

      // Obtener pedido actual para sumar el anticipo
      const { data: pedido, error: errPed } = await supabaseClient
        .from('pedidos')
        .select('folio, total, anticipo, estado')
        .eq('id_pedido', id_pedido)
        .single();
        
      if (errPed || !pedido) throw new Error("Pedido no encontrado al verificar.");

      // Verificar si YA guardamos este pago antes (para que no recargue la página y sume doble)
      // Buscamos en finanzas si existe ese session_id en la descripción
      const { data: existeFin } = await supabaseClient.from('erp_finanzas')
        .select('id')
        .ilike('descripcion', `%${session_id}%`)
        .limit(1);

      if (existeFin && existeFin.length > 0) {
        // Ya fue procesado, solo devolver éxito sin sumar doble
        return new Response(JSON.stringify({ success: true, mensaje: "Ya estaba verificado." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sumar el anticipo
      const nuevoAnticipo = parseFloat(pedido.anticipo || 0) + abono;
      
      // Registrar pago en erp_finanzas con el session_id para evitar duplicados
      const { error: errFin } = await supabaseClient.from('erp_finanzas').insert({
        tipo: 'ingreso',
        categoria: 'anticipo_pedido',
        monto: abono,
        metodo: 'tarjeta',
        descripcion: `Pago con Tarjeta Stripe (Sesion: ${session_id}) para pedido ${pedido.folio}`,
        id_pedido: id_pedido
      });
      
      if (errFin) throw new Error("Error guardando ingreso: " + errFin.message);

      // Calcular si ya llegó al 50%
      let nuevoEstado = pedido.estado;
      if (nuevoAnticipo >= (parseFloat(pedido.total) / 2)) {
        nuevoEstado = 'confirmado'; // Se manda automático a Producción
      }

      const { error: errUpdate } = await supabaseClient.from('pedidos')
        .update({ anticipo: nuevoAnticipo, estado: nuevoEstado })
        .eq('id_pedido', id_pedido);
        
      if (errUpdate) throw new Error("Error actualizando pedido: " + errUpdate.message);

      return new Response(JSON.stringify({ success: true, nuevo_anticipo: nuevoAnticipo, estado: nuevoEstado }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 2. CREAR SESIÓN DE PAGO (Link)
    // ==========================================
    const { id_pedido, monto, url_retorno } = payload;
    const { data: pedido, error: dbError } = await supabaseClient
      .from('pedidos')
      .select('folio, total, anticipo')
      .eq('id_pedido', id_pedido)
      .single();

    if (dbError || !pedido) throw new Error("Pedido no encontrado en Base de Datos");

    const restanteReal = parseFloat(pedido.total) - parseFloat(pedido.anticipo || 0);
    let montoAPagar = parseFloat(monto);
    
    if (montoAPagar > restanteReal) montoAPagar = restanteReal;
    if (parseFloat(pedido.anticipo || 0) === 0 && montoAPagar < (parseFloat(pedido.total) / 2)) {
        montoAPagar = parseFloat(pedido.total) / 2;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Abono a Pedido: ${pedido.folio}`,
              description: 'Liquidación o Anticipo de 50% (Monarca Pastelería)',
            },
            unit_amount: Math.round(montoAPagar * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // MAGIA: Stripe inyectará el session_id a nuestra URL
      success_url: `${url_retorno}&pago=exito&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url_retorno}&pago=cancelado`,
      metadata: {
        id_pedido: id_pedido.toString(),
        monto_pagado: montoAPagar.toString()
      }
    });

    return new Response(
      JSON.stringify({ id: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
