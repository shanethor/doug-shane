const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({ error: 'Daily API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, roomType } = await req.json();
    if (!userId || !roomType) {
      return new Response(JSON.stringify({ error: 'Missing userId or roomType' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roomName = roomType === 'video' ? 'aura-beta-video' : 'aura-beta-voice';

    // Create or get room
    const roomRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DAILY_API_KEY}` },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          enable_chat: true,
          max_participants: 5,
          enable_screenshare: roomType === 'video',
          start_video_off: roomType === 'voice',
          start_audio_off: false,
        },
      }),
    });

    const roomData = await roomRes.json();
    // If room already exists (409), that's fine
    if (!roomRes.ok && roomRes.status !== 409) {
      console.error('Room creation error:', roomData);
    }

    // Create meeting token
    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DAILY_API_KEY}` },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userId === 'jane' ? 'Jane Smith' : 'Douglas Wenz',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          start_video_off: roomType === 'voice',
          start_audio_off: false,
        },
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      console.error('Token creation error:', err);
      return new Response(JSON.stringify({ error: 'Failed to create meeting token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenRes.json();

    // Get the domain from rooms API
    const domainRes = await fetch('https://api.daily.co/v1/', {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    const domainData = await domainRes.json();
    const domain = domainData.domain_name || 'unknown';

    return new Response(JSON.stringify({
      token: tokenData.token,
      roomName,
      roomUrl: `https://${domain}.daily.co/${roomName}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
