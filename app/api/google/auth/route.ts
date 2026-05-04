import { supabase } from '@/lib/supabase'
const { google } = require('googleapis');

function createOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3000/api/google/callback",
  );
}

async function saveTokens(userId:string, tokens){
  await supabase
  .from('users')
  .update({
    google_access_token: tokens.access_token,                                                                                                                                                               
    google_refresh_token: tokens.refresh_token,
    google_scope: tokens.scope,
    google_token_type: tokens.token_type,
    google_expiry_date: tokens.expiry_date,
  })
  .eq('id', userId);
}

export async function GET(request: Request) {                                                                                                                                                                 
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const oauth2Client = createOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: userId ?? '',
  });
  return Response.redirect(authUrl);
} 

async function storeGoogleCalendarEvents(userId: string) {
  const res = await fetch('/api/google/calendar/store', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

async function getStoredGoogleCalendarEvents(userId: string) {
  const res = await fetch(`/api/google/calendar/events?userId=${userId}`);
  const data = await res.json();
  return data.events || [];
}

async function connectGoogleAccount(userId: string) {
  window.location.href = `/api/google/auth?userId=${userId}`;
}

async function syncGoogleEvents(userId: string){
  const res = await fetch('/api/google/calendar/sync', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export { saveTokens, createOAuthClient, syncGoogleEvents, getStoredGoogleCalendarEvents, storeGoogleCalendarEvents, connectGoogleAccount};