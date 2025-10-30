import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Delete user function called')
    
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '')
    console.log('Getting user from token')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Invalid token or user not found:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('Deleting user:', userId)

    // Delete user data based on role
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (userRole?.role === 'doctor') {
      // Delete all patients and their measurements
      const { data: patients } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('doctor_id', userId)
      
      if (patients) {
        for (const patient of patients) {
          await supabaseAdmin.from('measurements').delete().eq('patient_id', patient.id)
        }
        await supabaseAdmin.from('patients').delete().eq('doctor_id', userId)
      }
      await supabaseAdmin.from('appointments').delete().eq('doctor_id', userId)
    } else if (userRole?.role === 'patient') {
      // Delete patient record and related data
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (patient) {
        await supabaseAdmin.from('measurements').delete().eq('patient_id', patient.id)
        await supabaseAdmin.from('appointments').delete().eq('patient_id', patient.id)
        await supabaseAdmin.from('patients').delete().eq('user_id', userId)
      }
    }
    
    // Delete user roles and profile
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    
    // Delete the auth user (this is the critical step!)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User deleted successfully')
    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
