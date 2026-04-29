import { supabase } from '@/lib/supabase'
const { google } = require('googleapis');
import { Database } from '@/types/database.types'

const listGoogleEvents = async (userId : string, calendarId: string = "primary") => {
    try {
      const { data: user, error } = await supabase                                                                                                                                                                  
      .from('users')                                                                                                                                                                                            
      .select('*')  
      .eq('id', userId)                                                                                                                                                                                           
      .single();       
   
      if (!user?.google_access_token) throw new Error("Google tokens not found for user.");
   
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        ""
      );
   
   
      oAuth2Client.setCredentials({
        access_token: user.google_access_token,
        refresh_token: user.google.refresh_token,
        scope: user.google.scope,
        token_type: user.google.token_type,
        expiry_date: user.google.expiry_date,
      });
   
   
      oAuth2Client.on("tokens", async (tokens) => {
        if (tokens.access_token) {
          await supabase                                                                                                                                                                                                
          .from('users')                                                                                                                                                                                            
          .update({     
            google_access_token: tokens.access_token,
            google_expiry_date: tokens.expiry_date,  
          })                                       
          .eq('id', userId);
        }
      });
   
   
      const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
   
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
   
   
      const result = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      });
   
   
      const events = result.data.items || [];
    }

     /* return events
      .filter((e) => {
        return !e.iCalUID || !e.iCalUID.endsWith("");
      })
      .map((e) => ({
        id: e.id,
        iCalUID: e.iCalUID,
        summary: e.summary,
        description: e.description,
        start: e.start,
        end: e.end,
        color: e.colorId,
      }));
    } catch (error) {
      console.error("Error fetching calendar:", error.message);
      return null;
    }
   };
   */