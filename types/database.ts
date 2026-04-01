export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          token: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          token: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          token?: string
          created_at?: string
        }
      }
      availability: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          hour: number
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          hour: number
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          hour?: number
        }
      }
      ideas: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string
          created_at: string
          duration_minutes: number | null
          is_outdoor: boolean | null
          location: string | null
          travel_car_minutes: number | null
          travel_transit_minutes: number | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by: string
          created_at?: string
          duration_minutes?: number | null
          is_outdoor?: boolean | null
          location?: string | null
          travel_car_minutes?: number | null
          travel_transit_minutes?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string
          created_at?: string
          duration_minutes?: number | null
          is_outdoor?: boolean | null
          location?: string | null
          travel_car_minutes?: number | null
          travel_transit_minutes?: number | null
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
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
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
}

export type EventWithRSVPs = Event & {
  end_time: string | null
  location: string | null
  rsvp_yes: number
  rsvp_maybe: number
  rsvp_no: number
  user_rsvp: 'yes' | 'maybe' | 'no' | null
  rsvp_yes_names: string[]
  rsvp_maybe_names: string[]
  rsvp_no_names: string[]
}
