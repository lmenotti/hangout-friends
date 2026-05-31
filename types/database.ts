export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          token: string
          email: string | null
          created_at: string
          home_location: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_scope: string | null
          google_token_type: string | null
          google_expiry_date: number | null
          name_source: string | null
        }
        Insert: {
          id?: string
          name: string
          token: string
          email?: string | null
          created_at?: string
          home_location?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_scope?: string | null
          google_token_type?: string | null
          google_expiry_date?: number | null
          name_source?: string | null
        }
        Update: {
          id?: string
          name?: string
          token?: string
          email?: string | null
          created_at?: string
          home_location?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_scope?: string | null
          google_token_type?: string | null
          google_expiry_date?: number | null
          name_source?: string | null
        }
      }
      magic_link_tokens: {
        Row: {
          id: string
          token: string
          email: string
          name: string | null
          return_to: string | null
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          email: string
          name?: string | null
          return_to?: string | null
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          email?: string
          name?: string | null
          return_to?: string | null
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
      }
      availability: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          hour: number
          minute: number
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          hour: number
          minute?: number
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          hour?: number
          minute?: number
        }
      }
      ideas: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string | null
          created_by_name: string | null
          poll_id: string | null
          created_at: string
          duration_minutes: number | null
          is_outdoor: boolean | null
          location: string | null
          travel_car_minutes: number | null
          travel_transit_minutes: number | null
          travel_walk_minutes: number | null
          is_scheduled: boolean
          suggested_at: string | null
          travel_origin: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by?: string | null
          created_by_name?: string | null
          poll_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          is_outdoor?: boolean | null
          location?: string | null
          travel_car_minutes?: number | null
          travel_transit_minutes?: number | null
          travel_walk_minutes?: number | null
          is_scheduled?: boolean
          suggested_at?: string | null
          travel_origin?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string | null
          created_by_name?: string | null
          poll_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          is_outdoor?: boolean | null
          location?: string | null
          travel_car_minutes?: number | null
          travel_transit_minutes?: number | null
          travel_walk_minutes?: number | null
          is_scheduled?: boolean
          suggested_at?: string | null
          travel_origin?: string | null
        }
      }
      idea_votes: {
        Row: {
          idea_id: string
          user_id: string
        }
        Insert: {
          idea_id: string
          user_id: string
        }
        Update: {
          idea_id?: string
          user_id?: string
        }
      }
      events: {
        Row: {
          id: string
          idea_id: string | null
          title: string
          description: string | null
          scheduled_at: string | null
          end_time: string | null
          location: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          idea_id?: string | null
          title: string
          description?: string | null
          scheduled_at?: string | null
          end_time?: string | null
          location?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          idea_id?: string | null
          title?: string
          description?: string | null
          scheduled_at?: string | null
          end_time?: string | null
          location?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      rsvps: {
        Row: {
          event_id: string
          user_id: string
          status: 'yes' | 'maybe' | 'no'
        }
        Insert: {
          event_id: string
          user_id: string
          status: 'yes' | 'maybe' | 'no'
        }
        Update: {
          event_id?: string
          user_id?: string
          status?: 'yes' | 'maybe' | 'no'
        }
      }
      polls: {
        Row: {
          id: string
          title: string
          creator_name: string
          date_options: string[]
          slug: string
          status: 'polling' | 'scheduled'
          scheduled_at: string | null
          scheduled_end_at: string | null
          scheduled_idea_id: string | null
          scheduled_slot_key: string | null
          expires_at: string | null
          archived_at: string | null
          created_at: string
        }
      }
      poll_rsvps: {
        Row: {
          poll_id: string
          respondent_name: string
          status: 'yes' | 'maybe' | 'no'
          created_at: string
          updated_at: string
        }
      }
      poll_idea_votes: {
        Row: {
          idea_id: string
          respondent_name: string
          created_at: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          endpoint: string
          p256dh: string
          auth: string
          user_id: string | null
          device_id: string | null
          plan_watches: { poll_id: string; role: 'creator' | 'rsvp'; respondent_name?: string }[]
          created_at: string
        }
        Insert: {
          id?: string
          endpoint: string
          p256dh: string
          auth: string
          user_id?: string | null
          device_id?: string | null
          plan_watches?: { poll_id: string; role: 'creator' | 'rsvp'; respondent_name?: string }[]
          created_at?: string
        }
        Update: {
          id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_id?: string | null
          device_id?: string | null
          plan_watches?: { poll_id: string; role: 'creator' | 'rsvp'; respondent_name?: string }[]
          created_at?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']

/** API-safe user shape returned from GET /api/users (no Google secrets). */
export type UserPublic = Pick<User, 'id' | 'name' | 'token' | 'created_at' | 'home_location' | 'email'> & {
  google_calendar_connected?: boolean
}
export type Idea = Database['public']['Tables']['ideas']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type RSVP = Database['public']['Tables']['rsvps']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']

export type IdeaWithVotes = Idea & {
  vote_count: number
  user_voted: boolean
  creator_name: string
  voter_names: string[]
  duration_minutes: number | null
  is_outdoor: boolean | null
  location: string | null
  travel_car_minutes: number | null
  travel_transit_minutes: number | null
  travel_walk_minutes: number | null
  is_scheduled: boolean
  suggested_at: string | null
  travel_origin: string | null
}

export type EventWithRSVPs = Event & {
  end_time: string | null
  location: string | null
  created_by: string | null
  rsvp_yes: number
  rsvp_maybe: number
  rsvp_no: number
  user_rsvp: 'yes' | 'maybe' | 'no' | null
  rsvp_yes_names: string[]
  rsvp_maybe_names: string[]
  rsvp_no_names: string[]
}
