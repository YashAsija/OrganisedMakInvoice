import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Get the most recent session for this user
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, language')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ messages: [], sessionId: null, language: 'en' });
    }

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true });

    let formattedMessages: any[] = [];
    if (messages) {
      formattedMessages = messages.map((m: any) => {
        let content = m.content;
        let route = null;
        if (m.role === 'assistant') {
          try {
            const parsed = JSON.parse(m.content);
            content = parsed.reply || m.content;
            route = parsed.route || null;
          } catch (e) {
            // Ignore, it's just raw text
          }
        }
        return {
          id: m.id,
          role: m.role,
          content: content,
          route: route,
          created_at: m.created_at
        };
      });
    }

    return NextResponse.json({ 
      messages: formattedMessages,
      sessionId: sessionData.id,
      language: sessionData.language
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Allow creating a new session
  try {
    const body = await request.json();
    const { userId, language = 'en' } = body;
    
    let sessionData = null;
    
    if (userId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ user_id: userId, language }])
        .select()
        .single();
      
      if (data) sessionData = data;
    } else {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ language }])
        .select()
        .single();
      
      if (data) sessionData = data;
    }

    return NextResponse.json({ sessionId: sessionData?.id || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
