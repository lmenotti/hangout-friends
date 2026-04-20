import { supabase } from '@/lib/supabase'
const { google } = require('googleapis');

function createOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "",
  );
}

async function saveTokens(userId, tokens){
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