import { supabase } from '@/lib/supabase'
const { google } = require('googleapis');
import { createOAuthClient, saveTokens } from '../auth/route'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');

  if (!code || !userId) return new Response('Missing params', { status: 400 });

  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  await saveTokens(userId, tokens);

  return Response.redirect('http://localhost:3000'); 
}