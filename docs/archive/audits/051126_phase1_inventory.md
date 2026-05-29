
---
  Phase 1: Codebase Inventory

  ---
  Directory-by-Directory Summary

  app/ — Next.js App Router pages. Each subfolder is a route segment.

  - app/page.tsx — Root page. Shows a marketing landing for unauthenticated users; shows a
   dashboard (upcoming events + availability heatmap + quick links) for signed-in users.
  - app/layout.tsx — Root layout. Wraps all pages in UserProvider, renders Nav, BottomNav,
   and NameModal. Loads Google Maps JS globally via <Script>.
  - app/availability/page.tsx — Full-page availability grid. Thin wrapper around
  AvailabilityGrid component.
  - app/calendar/page.tsx — React-big-calendar view showing group availability as teal
  heatmap blocks. Has a "My Calendar" tab with a Google Calendar connect button, but that
  tab is a non-functional placeholder (no OAuth routes exist, button points to
  /api/google/auth which doesn't exist).
  - app/events/page.tsx — Lists all events via EventsList, allows creating events manually
   via CreateEventForm.
  - app/ideas/page.tsx — Thin wrapper around IdeasBoard with showSchedule enabled.
  - app/profile/page.tsx — Shows signed-in user's name, home location editor (Google
  Places autocomplete), bug report link, and sign-out button.
  - app/bugs/page.tsx — Simple form for signed-in users to submit bug reports.
  - app/admin/page.tsx — PIN-protected admin panel. Shows all users, ideas, events, and
  bug reports. Allows deleting any record, managing approved_names, marking bug reports
  resolved, and asking Claude API to suggest bug fixes.
  - app/pods/page.tsx — Lists the signed-in user's pods with create/join CTAs.
  - app/pods/new/page.tsx — Form to create a new pod.
  - app/pods/join/page.tsx — Server component with generateMetadata. Renders
  JoinFormClient.tsx for joining by invite code.
  - app/pods/join/JoinFormClient.tsx — Client component: invite-code input form, requires
  sign-in.
  - app/pods/[id]/page.tsx — Pod dashboard with 4 tabs: Availability (read-only group
  heatmap), Ideas, Events, Members.
  - app/pods/[id]/events/[eventId]/page.tsx — Event detail page with generateMetadata for
  OG tags. Renders EventPageClient.tsx.
  - app/pods/[id]/events/[eventId]/EventPageClient.tsx — Client component showing event
  details and RSVP buttons (yes/no only).
  - app/polls/new/page.tsx — No-account poll creation: date picker, poll title, creator
  name.
  - app/polls/[id]/page.tsx — Server component with generateMetadata. Renders
  PollPageClient.tsx.
  - app/polls/[id]/PollPageClient.tsx — Interactive when2meet-style availability grid for
  an anonymous poll.

  ---
  app/api/ — All server-side route handlers. See full route list below.

  ---
  components/

  - Nav.tsx — Sticky top nav. Desktop: text links (Availability, Pods, Poll, Ideas,
  Events, Calendar, Report). Shows "Sign in" button for guest-mode users. Shows profile
  link for signed-in users.
  - BottomNav.tsx — Mobile bottom nav bar (hidden on md+). Tabs: Home, Schedule, Ideas,
  Events, Profile, Calendar.
  - NameModal.tsx — Full-screen modal that blocks all pages (except /admin) until user
  enters a name. Supports optional password, home location, and guest-mode bypass.
  - AvailabilityGrid.tsx — Interactive drag-to-paint grid for marking weekly recurring
  availability. Accepts optional podId (filters to pod members), optional readOnly prop.
  - IdeasBoard.tsx — Ideas list with upvote cards, schedule panel per card (auto-schedule
  or manual datetime pick), and "schedule all" button. Fetches and displays per-user
  commute times from the viewer's home location.
  - EventsList.tsx — Chronological event cards with RSVP buttons (Yes/Maybe/No),
  edit/delete for owners, commute time display, past-events collapsible section.
  - CreateEventForm.tsx — Collapsible manual event creation form (title, description,
  date, start/end time, location).
  - PlacesInput.tsx — Text input with Google Places Autocomplete. Falls back to
  server-side suggestions from /api/places/autocomplete if Maps JS doesn't load within 5
  seconds.
  - PollGrid.tsx — Interactive drag-select availability grid for polls. Columns = date
  strings, rows = half-hour slots 9am–9pm. Shows teal heatmap from aggregate.
  - PodIdeasTab.tsx — Pod-scoped ideas tab: card grid with heart voting, sort options,
  "Schedule it" button/modal.
  - PodEventsTab.tsx — Pod-scoped events tab: chronological list with RSVP (yes/no), add
  event form, recurrence label.
  - RecurrencePicker.tsx — Preset buttons (None/Weekly/Biweekly/Monthly/Custom) plus
  optional end date for recurring events.
  - ScheduleIdeaModal.tsx — Modal to convert a pod idea into a scheduled event.
  Date/time/end time/location inputs, RecurrencePicker, toggle to show group availability
  heatmap.
  - ChakraProvider.tsx — Wraps children in Chakra UI's ChakraProvider. Not imported
  anywhere in the current codebase (orphaned).

  ---
  lib/

  - supabase.ts — Singleton Supabase JS client using NEXT_PUBLIC_SUPABASE_URL and
  NEXT_PUBLIC_SUPABASE_ANON_KEY. Uses a Proxy to allow import { supabase } without eager
  initialization.
  - weather.ts — Open-Meteo integration (no API key). geocodeLocation() geocodes a text
  address. fetchWeatherMap() fetches 14-day hourly forecast and returns a map of
  hour→weather score (0–10). lookupWeatherScore() looks up a score for a scheduled
  datetime.
  - password.ts — hashPassword() and verifyPassword() using Node's scrypt. Used in
  app/api/users/route.ts.
  - googleCalendar.ts — Incomplete/broken. Contains a listGoogleEvents function that
  references user.google.refresh_token (wrong shape — should be
  user.google_refresh_token), imports @/types/database.types (file does not exist), and
  has the return block commented out. The function has a syntax error (missing
  catch/finally) flagged by the TypeScript compiler. Not imported anywhere else.

  ---
  types/database.ts — Manually maintained TypeScript types for users, availability, ideas,
   idea_votes, events, and rsvps. Does not include bug_reports, approved_names, polls,
  poll_responses, pods, or pod_members tables added in later migrations. Out of date.

  ---
  migrations/ — 16 numbered SQL files run sequentially before build.

  ---
  scripts/migrate.mjs — Reads numbered SQL files in order, runs them against Postgres via
  the pg package using DATABASE_URL. Skips already-applied migrations by tracking them in
  a _migrations table.

  ---
  All API Routes

  Route: GET /api/users
  Method(s): GET
  What it does: Returns user record by x-user-token header
  ────────────────────────────────────────
  Route: POST /api/users
  Method(s): POST
  What it does: Creates new user or re-authenticates returning user (by name + optional
    password)
  ────────────────────────────────────────
  Route: PATCH /api/users
  Method(s): PATCH
  What it does: Updates home_location for authenticated user
  ────────────────────────────────────────
  Route: GET /api/users/check
  Method(s): GET
  What it does: Returns { exists: bool } for a given name (case-insensitive). Used by
    NameModal for real-time "returning user" detection
  ────────────────────────────────────────
  Route: GET /api/availability
  Method(s): GET
  What it does: Returns aggregate slot counts, per-slot names, current user's slots, total

    user count. Accepts optional ?pod_id= to filter to pod members
  ────────────────────────────────────────
  Route: POST /api/availability
  Method(s): POST
  What it does: Replaces all availability rows for the authenticated user
  ────────────────────────────────────────
  Route: GET /api/ideas
  Method(s): GET
  What it does: Returns all unscheduled ideas with vote counts, voter names, creator
  names,
    travel times
  ────────────────────────────────────────
  Route: POST /api/ideas
  Method(s): POST
  What it does: Creates an idea; fetches travel times from Google Maps if location
  provided
  ────────────────────────────────────────
  Route: PATCH /api/ideas/[id]
  Method(s): PATCH
  What it does: Updates an idea (owner only); re-fetches travel times if location changed
  ────────────────────────────────────────
  Route: DELETE /api/ideas/[id]
  Method(s): DELETE
  What it does: Deletes an idea and its votes (owner only)
  ────────────────────────────────────────
  Route: POST /api/ideas/[id]/vote
  Method(s): POST
  What it does: Toggles the authenticated user's vote on an idea
  ────────────────────────────────────────
  Route: GET /api/events
  Method(s): GET
  What it does: Returns all events with RSVP counts and voter names
  ────────────────────────────────────────
  Route: POST /api/events
  Method(s): POST
  What it does: Creates an event; if idea_id provided, marks that idea as scheduled
  ────────────────────────────────────────
  Route: GET /api/events/[id]
  Method(s): GET
  What it does: Returns a single event with RSVPs (no auth required)
  ────────────────────────────────────────
  Route: PATCH /api/events/[id]
  Method(s): PATCH
  What it does: Updates an event (owner or events with null created_by)
  ────────────────────────────────────────
  Route: DELETE /api/events/[id]
  Method(s): DELETE
  What it does: Deletes an event and its RSVPs (owner only)
  ────────────────────────────────────────
  Route: POST /api/events/[id]/rsvp
  Method(s): POST
  What it does: Upserts an RSVP (yes/maybe/no) for the authenticated user
  ────────────────────────────────────────
  Route: POST /api/auto-schedule
  Method(s): POST
  What it does: Finds the best availability slot for one idea (2+ votes required).
    Considers voter overlap, commute buffer, weather for outdoor ideas. Creates event and
    marks idea scheduled
  ────────────────────────────────────────
  Route: POST /api/auto-schedule/all
  Method(s): POST
  What it does: Schedules all eligible unscheduled ideas (2+ votes) in vote-count order,
    avoiding slot conflicts between them
  ────────────────────────────────────────
  Route: GET /api/places/autocomplete                                                     
  Method(s): GET
  What it does: Proxies Google Places Autocomplete API; fallback for PlacesInput when Maps
                                                                                        
    JS doesn't load                                                                     
  ────────────────────────────────────────
  Route: POST /api/travel-time                                                            
  Method(s): POST
  What it does: Batched Google Maps Distance Matrix API call; returns car/transit/walk    
    minutes from one origin to multiple destinations                                    
  ────────────────────────────────────────                                              
  Route: GET /api/admin                                                                   
  Method(s): GET
  What it does: Returns all users, ideas, events, bug reports (requires x-admin-pin       
  header)                                                                               
  ────────────────────────────────────────                                              
  Route: DELETE /api/admin                                                                
  Method(s): DELETE
  What it does: Deletes any user, idea, event, or bug report by type+id                   
  ────────────────────────────────────────                                              
  Route: GET /api/admin/approved-names                                                    
  Method(s): GET
  What it does: Returns the approved_names list                                           
  ────────────────────────────────────────                                              
  Route: POST /api/admin/approved-names                                                 
  Method(s): POST
  What it does: Adds a name to approved_names
  ────────────────────────────────────────
  Route: DELETE /api/admin/approved-names                                                 
  Method(s): DELETE
  What it does: Removes a name from approved_names                                        
  ────────────────────────────────────────                                              
  Route: POST /api/bug-reports                                                          
  Method(s): POST
  What it does: Submits a bug report (requires sign-in)
  ────────────────────────────────────────
  Route: PATCH /api/bug-reports/[id]                                                      
  Method(s): PATCH
  What it does: Toggles resolved on a bug report (requires admin PIN)                     
  ────────────────────────────────────────                                              
  Route: POST /api/claude-fix                                                             
  Method(s): POST
  What it does: Sends a bug report to the Claude API and returns a fix suggestion         
  (requires                                                                             
    admin PIN)                                                                          
  ────────────────────────────────────────
  Route: GET /api/polls (implied)                                                         
  Method(s): POST
  What it does: Creates a poll (title, creator name, date options)                        
  ────────────────────────────────────────                                              
  Route: GET /api/polls/[id]                                                              
  Method(s): GET
  What it does: Returns poll, all responses, and aggregate slot counts                    
  ────────────────────────────────────────                                              
  Route: POST /api/polls/[id]/respond                                                     
  Method(s): POST
  What it does: Upserts a poll response by respondent name                                
  ────────────────────────────────────────                                              
  Route: GET /api/pods                                                                    
  Method(s): GET
  What it does: Returns all pods the authenticated user belongs to, with member counts    
  ────────────────────────────────────────                                              
  Route: POST /api/pods                                                                   
  Method(s): POST
  What it does: Creates a pod with a random 6-char invite code; creator auto-joins as     
  owner                                                                                 
  ────────────────────────────────────────                                              
  Route: POST /api/pods/join                                                              
  Method(s): POST
  What it does: Joins a pod by invite code; no-op if already a member                     
  ────────────────────────────────────────                                              
  Route: GET /api/pods/[id]                                                               
  Method(s): GET
  What it does: Returns pod details, member list with last_seen, and requester's role     
  ────────────────────────────────────────                                              
  Route: GET /api/pods/[id]/ideas                                                         
  Method(s): GET
  What it does: Returns pod-scoped ideas with vote counts, creator names, sort options    
  ────────────────────────────────────────                                              
  Route: POST /api/pods/[id]/ideas                                                        
  Method(s): POST
  What it does: Creates a pod-scoped idea                                                 
  ────────────────────────────────────────                                              
  Route: POST /api/pods/[id]/ideas/[ideaId]/vote                                          
  Method(s): POST
  What it does: Toggles vote on a pod idea; updates vote_count on the idea row            
  ────────────────────────────────────────                                              
  Route: POST /api/pods/[id]/ideas/[ideaId]/schedule                                      
  Method(s): POST
  What it does: Converts a pod idea to an event; sets idea status='scheduled'             
  ────────────────────────────────────────                                              
  Route: GET /api/pods/[id]/events                                                        
  Method(s): GET
  What it does: Returns pod-scoped events (parent only, no recurrence children) with RSVP 
    counts and names                                                                    
  ────────────────────────────────────────                                              
  Route: POST /api/pods/[id]/events                                                       
  Method(s): POST
  What it does: Creates a pod-scoped event with optional recurrence fields                
  ────────────────────────────────────────                                              
  Route: GET /api/og                                                                      
  Method(s): GET
  What it does: Returns a 1200×630 PNG OG image (edge runtime) with title/subtitle/CTA    
  from                                                                                  
    query params                                                                        

  ---
  Every Database Table
                      
  Table: users                                                                          
  Stores: User records: id, name, token (auth), created_at, home_location, password_hash, 
    last_seen, google_access_token, google_refresh_token, google_scope, google_token_type,
                                                                                          
    google_expiry_date                                                                  
  ────────────────────────────────────────                                                
  Table: availability                                                                   
  Stores: Recurring weekly free slots per user: user_id, day_of_week (0–6), hour (0–23),  
    minute (0 or 30)                                                                      
  ────────────────────────────────────────                                              
  Table: ideas                                                                            
  Stores: Hangout ideas: title, description, created_by, duration_minutes, is_outdoor,  
    location, travel_car_minutes, travel_transit_minutes, travel_walk_minutes,            
    travel_origin, is_scheduled, suggested_at, pod_id, status (open/scheduled/archived),
    suggested_place, proposed_date, proposed_time, vote_count                             
  ────────────────────────────────────────                                              
  Table: idea_votes                                                                       
  Stores: Votes on ideas: (idea_id, user_id) composite PK, created_at
  ────────────────────────────────────────                                                
  Table: events                                                                           
  Stores: Scheduled events: title, description, scheduled_at, end_time, location,       
    created_by, idea_id (original), pod_id, source_idea_id, recurrence_rule,              
    recurrence_end, parent_event_id                                                     
  ────────────────────────────────────────                                              
  Table: rsvps                                                                            
  Stores: RSVPs on events: (event_id, user_id) composite PK, status (yes/maybe/no)
  ────────────────────────────────────────                                                
  Table: approved_names                                                                   
  Stores: Allowlist of names that can sign in. Table exists and is managed by admin UI, 
  but                                                                                     
    the check was removed from the sign-in flow — table is populated but not enforced   
  ────────────────────────────────────────                                              
  Table: bug_reports                                                                      
  Stores: Bug reports from users: title, description, reported_by, reported_at, resolved
  ────────────────────────────────────────                                                
  Table: polls                                                                            
  Stores: Anonymous scheduling polls: title, creator_name, date_options (JSONB array of 
  ISO                                                                                     
    date strings), expires_at                                                           
  ────────────────────────────────────────                                              
  Table: poll_responses                                                                   
  Stores: Responses to polls: poll_id, respondent_name, availability (JSONB map of slot
    keys → bool)                                                                          
  ────────────────────────────────────────                                              
  Table: pods                                                                             
  Stores: Friend groups: name, invite_code, created_by
  ────────────────────────────────────────                                                
  Table: pod_members                                                                      
  Stores: Pod membership: (pod_id, user_id) PK, role (owner/member), joined_at          
                                                                                          
  ---                                                                                   
  Every User-Facing Page / Feature                                                      
                                                                                          
  ┌─────────────────────────────┬───────────────────────────────────┬─────────────────┐
  │            Page             │           What it does            │  Auth required  │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │                             │ Landing (marketing) or dashboard  │ No (landing     │ 
  │ /                           │ (upcoming events + availability   │ shown to        │
  │                             │ heatmap)                          │ guests)         │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤
  │ /availability               │ Mark and view weekly recurring    │ Mark: yes;      │   
  │                             │ availability as a grid heatmap    │ View: no        │ 
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤   
  │                             │ React-big-calendar view of group  │                 │   
  │ /calendar                   │ availability heatmap; "My         │ View: no; Save: │ 
  │                             │ Calendar" tab is non-functional   │  yes            │   
  │                             │ placeholder                       │                 │ 
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │ /ideas                      │ Suggest hangout ideas, vote,      │ View: no;       │   
  │                             │ auto-schedule, manual schedule    │ Interact: yes   │
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤   
  │                             │ View and RSVP on events, create   │ View: no;       │   
  │ /events                     │ events manually                   │ RSVP/create:    │ 
  │                             │                                   │ yes             │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │ /profile                    │ View name, set home address, sign │ Yes             │   
  │                             │  out, link to bug report          │                 │ 
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │ /bugs                       │ Submit bug reports                │ Yes             │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤
  │                             │ Manage users, ideas, events, bug  │                 │   
  │ /admin                      │ reports, approved names; ask      │ PIN             │ 
  │                             │ Claude for bug fix suggestions    │                 │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤
  │ /polls/new                  │ Create an anonymous scheduling    │ No              │   
  │                             │ poll (no account)                 │                 │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │                             │ View a poll's availability        │                 │   
  │ /polls/[id]                 │ heatmap, mark your slots, see     │ No              │   
  │                             │ best times and participants       │                 │ 
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤   
  │ /pods                       │ List your pods, links to          │ Yes             │ 
  │                             │ create/join                       │                 │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤
  │ /pods/new                   │ Create a pod                      │ Yes             │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │ /pods/join                  │ Join a pod by invite code         │ Yes             │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │                             │ Pod dashboard: 4 tabs — group     │                 │   
  │ /pods/[id]                  │ availability, ideas (vote +       │ Yes             │
  │                             │ schedule), events (RSVP), members │                 │   
  ├─────────────────────────────┼───────────────────────────────────┼─────────────────┤ 
  │ /pods/[id]/events/[eventId] │ Single event detail with RSVP     │ RSVP: yes       │ 
  └─────────────────────────────┴───────────────────────────────────┴─────────────────┘

  ---
  Potentially Unused, Orphaned, or Dead Code
                                            
  Confirmed orphaned / non-functional:
                                                                                          
  - lib/googleCalendar.ts — Not imported anywhere in the codebase. Contains a syntax error
   (missing catch/finally block) that the TypeScript compiler flags. References           
  user.google.refresh_token (wrong field shape — the column is google_refresh_token). The 
  return block is entirely commented out. Imports @/types/database.types which does not 
  exist.                                                                                
  - components/ChakraProvider.tsx — Not imported anywhere. Was presumably used during an
  earlier Chakra UI attempt that was abandoned. @chakra-ui/react remains in package.json. 
  - /api/google/auth — Referenced in app/calendar/page.tsx (window.location.href = 
  '/api/google/auth?userId=...') but the route file does not exist. The "Connect Google   
  Calendar" button has a dead link.                                                     
  - Google token columns in users — google_access_token, google_refresh_token,            
  google_scope, google_token_type, google_expiry_date added in migration 012. Nothing     
  reads or writes these columns except the non-functional googleCalendar.ts.            
  - approved_names table — The table exists, is populated via admin UI, and the API routes
   for managing it are functional. However, the actual sign-in check against this table   
  was removed from app/api/users/route.ts. The table has data but no effect.            
  - Calendar "My Calendar" tab — The tab exists in app/calendar/page.tsx but renders a    
  placeholder with a broken OAuth button. No Google OAuth routes are implemented.         
                                                                                        
  Stale / out-of-date:                                                                    
                                                                                        
  - types/database.ts — Missing types for bug_reports, approved_names, polls,             
  poll_responses, pods, and pod_members. The file is used for IdeaWithVotes and         
  EventWithRSVPs type aliases but the Database type itself is incomplete by 6 tables.     
  - AvailabilityGrid.tsx (used in PodIdeasTab.tsx via ScheduleIdeaModal) — The          
  ScheduleIdeaModal passes podId to AvailabilityGrid, but AvailabilityGrid only supports  
  the readOnly prop for display. The actual saving of availability is done on
  /availability and /calendar. This is not broken — just worth noting the read-only use   
  case.                                                                                 
                                                                                        
  Structural inconsistency:                                                               
   
  - Ideas — two parallel systems: The original ideas table and /api/ideas routes are a    
  single global board (no pod scoping, is_scheduled flag, idea_id FK on events). The newer
   pod ideas use pod_id on the same ideas table, different status field (status text vs   
  is_scheduled bool), different vote count approach (vote_count integer vs counting from
  idea_votes), and separate pod-scoped API routes. Both systems exist simultaneously and
  touch the same ideas and idea_votes tables.
  - Events — two parallel systems: The global /api/events route and pod-scoped
  /api/pods/[id]/events route both read from and write to the same events table. The      
  global route ignores pod_id and source_idea_id. The pod route filters by pod_id and
  excludes parent_event_id IS NOT NULL rows.                                              
  - BottomNav.tsx links to /calendar as a sixth tab, but /calendar is not in Nav.tsx's  
  desktop links and the Calendar feature is non-functional (Google OAuth unimplemented).  
  The bottom nav also does not include Pods or Polls.