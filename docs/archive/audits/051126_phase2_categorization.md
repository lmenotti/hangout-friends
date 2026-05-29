Phase 2 Audit — Inventory vs. Blueprint                                               
                                                                                          
  Legend:                                                                                 
  - A — Core to the blueprint, keep as-is or minor polish                                 
  - B — Directionally right, needs meaningful work to match blueprint                     
  - C — Exists, contradicts or is out of scope per PRODUCT.md/GOALS.md                  
  - D — In the blueprint but missing or not yet built
  - E — Dead, broken, or orphaned — safe to delete

  ---
  Step 1: Category Table

  Core Features (PRODUCT.md §"Core features")

  Feature: Plan creation (/polls/new)                                                     
  Blueprint status: Must-ship #1                                                       
  Current state: Exists. Single screen.                                                   
  Category: B — URL and naming don't match blueprint (/p/slug not /polls/uuid); slug UX 
    missing                                                                            
  ────────────────────────────────────────                                                
  Feature: Plan landing page (/polls/[id])                                             
  Blueprint status: Must-ship #2                                                          
  Current state: Exists. Mobile-unfriendly areas found in prior sessions.               
  Category: B — Core flow present but needs mobile polish audit per "5-friends teardown"  
    instruction
  ────────────────────────────────────────                                                
  Feature: Save-as-you-go availability                                                    
  Blueprint status: Must-ship #2
  Current state: Unknown — need to verify no submit button                                
  Category: B — Needs confirmation                                                      
  ────────────────────────────────────────
  Feature: Availability heatmap                                                           
  Blueprint status: Must-ship #3
  Current state: Exists (color grid). Tap-to-see-who unknown.                             
  Category: B — "Who's free" tap feature and the 80%+ toggle are likely missing         
  ────────────────────────────────────────
  Feature: Activity ideas board                                                           
  Blueprint status: Must-ship #4
  Current state: Exists but wrong scope — ideas are global or pod-scoped; no plan-scoped  
    ideas                                                                               
  Category: C — Schema doesn't support ideas-per-plan as described
  ────────────────────────────────────────
  Feature: Auto-schedule                                                                  
  Blueprint status: Must-ship #5
  Current state: Unclear from audit — route/algorithm location unknown                    
  Category: B/D — Needs verification                                                    
  ────────────────────────────────────────
  Feature: RSVP (yes/maybe/no)                                                            
  Blueprint status: Must-ship #6
  Current state: Exists. Status values match.                                             
  Category: A                                                                           
  ────────────────────────────────────────
  Feature: Rich link previews (OG tags)                                                   
  Blueprint status: Must-ship #7
  Current state: Just built this session for polls, pods/join, events.                    
  Category: B — Built but untested in iMessage; /pods/[id] itself has no OG metadata yet
  ────────────────────────────────────────
  Feature: PWA (manifest, icons, install prompt)                                          
  Blueprint status: Must-ship #8
  Current state: push_subscriptions table exists. Manifest/icons not audited.             
  Category: B — Partial; install prompt gating ("after 2+ plans") almost certainly missing
  ────────────────────────────────────────
  Feature: 3-notification system                                                          
  Blueprint status: Must-ship #8
  Current state: Push infra exists. Which notifications fire is unknown.                  
  Category: B/D — Infra present, correctness unknown                                    
  ────────────────────────────────────────
  Feature: Account creation (email + magic link)                                          
  Blueprint status: Must-ship #9
  Current state: Exists: /auth/signin, /auth/signup, /auth/magic-link                     
  Category: B — See approved_names concern below                                        
  ────────────────────────────────────────
  Feature: Anonymous-to-account migration (cookie claim)                                  
  Blueprint status: Must-ship #9
  Current state: Not found in audit                                                       
  Category: D — Missing                                                                 
  ────────────────────────────────────────
  Feature: Pods (basic)                                                                   
  Blueprint status: Must-ship #10
  Current state: Extensively built. 4-tab dashboard, invite code, members.                
  Category: A                                                                           
  ────────────────────────────────────────
  Feature: Read-only Google Calendar sync                                                 
  Blueprint status: Must-ship #11
  Current state: lib/googleCalendar.ts broken (syntax error). OAuth flow missing. DB      
    columns unused. "My Calendar" tab placeholder.                                      
  Category: C — Feature is in blueprint but entire implementation is non-functional.
    Rewrite required, not fix.
  ────────────────────────────────────────
  Feature: ICS export ("add to my calendar")                                              
  Blueprint status: Build order #8
  Current state: Not found in audit                                                       
  Category: D — Missing                                                                 
  ────────────────────────────────────────
  Feature: Admin: remove participant/idea/member                                          
  Blueprint status: Must-ship #12
  Current state: Admin panel exists with user/poll/pod management                         
  Category: A                                                                           
  ────────────────────────────────────────
  Feature: Plan expiration (30 days post-event)                                           
  Blueprint status: Design principle #4
  Current state: No cron/scheduled function found                                         
  Category: D — Missing                                                                 
  ────────────────────────────────────────
  Feature: Plan password protection                                                       
  Blueprint status: Must-ship #1 optional
  Current state: Not found                                                                
  Category: D — Missing (explicitly listed as optional)                                 

  ---                                                                                     
  Pages / Routes
                                                                                          
  Item: / — Landing page                                                                
  Category: A                                                                           
  Note: Core marketing surface                                                          
  ────────────────────────────────────────                                              
  Item: /polls/[id] — Plan page                                                         
  Category: B                                                                             
  Note: Core surface, URL naming mismatch, mobile polish needed                           
  ────────────────────────────────────────                                                
  Item: /polls/new — Create plan                                                          
  Category: B                                                                           
  Note: Core, needs slug UX                                                             
  ────────────────────────────────────────                                              
  Item: /pods/[id] — Pod dashboard                                                        
  Category: A                                                                           
  Note: Built, 4-tab, directionally correct                                               
  ────────────────────────────────────────                                                
  Item: /pods/join                                                                      
  Category: A                                                                             
  Note: Invite code flow, OG tags added                                                 
  ────────────────────────────────────────                                                
  Item: /pods/new                                                                      
  Category: A                                                                             
  Note: Pod creation                                                                    
  ────────────────────────────────────────                                                
  Item: /pods/[id]/events/[eventId]                                                    
  Category: A                                                                             
  Note: Event detail, OG tags added                                                       
  ────────────────────────────────────────
  Item: /auth/signin, /auth/signup, /auth/magic-link                                      
  Category: B                                                                           
  Note: Exists; approved_names concern
  ────────────────────────────────────────
  Item: /admin, /admin/polls, /admin/pods, /admin/users
  Category: A
  Note: Functioning, matches blueprint
  ────────────────────────────────────────
  Item: /calendar
  Category: C — verging on E
  Note: "My Calendar" tab is placeholder. Calendar is a read-only utility per blueprint,
    not a destination page. Having a /calendar top-level route risks "drift into a
  calendar
     app."

  ---
  API Routes

  ┌──────────────────────────────┬───────────┬────────────────────────────────────────┐
  │         Route group          │ Category  │                  Note                  │
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/polls/* (create,        │           │ Core. Naming drift from "plan" to      │
  │ respond, slots, schedule)    │ B         │ "poll." Auto-schedule correctness      │
  │                              │           │ unknown.                               │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/pods/* (CRUD, members,  │ A         │ Well-built, matches pod surface        │   
  │ ideas, events)               │           │                                        │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/events/* (CRUD, RSVP)   │ A         │ Correct. GET handler just added.       │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤   
  │ /api/ideas/* (global, not    │           │ Global ideas don't match blueprint.    │
  │ plan-scoped)                 │ C         │ PRODUCT.md says ideas belong to a      │   
  │                              │           │ plan.                                  │ 
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤   
  │ /api/og                      │ A         │ Just built. Correct.                   │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/calendar/sync           │ B         │ Route exists but underlying lib is     │   
  │                              │           │ broken                                 │ 
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤   
  │ /api/google/auth             │ E —       │ Referenced in googleCalendar.ts but    │ 
  │                              │ missing   │ the file doesn't exist                 │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/weather                 │ C         │ Not in blueprint at all. Unknown who   │   
  │                              │           │ surfaces this data.                    │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/admin/*                 │ A         │ Matches blueprint's admin/moderation   │   
  │                              │           │ requirement                            │   
  ├──────────────────────────────┼───────────┼────────────────────────────────────────┤
  │ /api/auth/*                  │ B         │ Exists. approved_names check status    │   
  │                              │           │ unclear.                               │   
  └──────────────────────────────┴───────────┴────────────────────────────────────────┘
                                                                                          
  ---                                                                                   
  Database Tables

  ┌───────────────────────┬──────────┬────────────────────────────────────────────────┐
  │         Table         │ Category │                      Note                      │
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │ users                 │ A        │ Core                                           │
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │ polls                 │ B        │ Core. Named "polls" not "plans." Needs pod_id  │ 
  │                       │          │ FK verification.                               │   
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤
  │ poll_slots,           │ A        │ Core availability data                         │   
  │ poll_responses        │          │                                                │ 
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │ pods, pod_members     │ A        │ Correct                                        │ 
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │ events, rsvps         │ A        │ Correct                                        │
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │                       │          │ ideas has no poll_id — can't support           │ 
  │ ideas, idea_votes     │ C        │ plan-scoped ideas. Pod ideas use vote_count    │   
  │                       │          │ int; global ideas count idea_votes rows. Dual  │ 
  │                       │          │ inconsistent systems.                          │   
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤ 
  │ push_subscriptions    │ B        │ Infra correct, which notifications are sent    │   
  │                       │          │ unknown                                        │
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │                       │          │ Allowlist model contradicts PRODUCT.md open    │ 
  │ approved_names        │ C/E      │ sign-up. Check apparently removed from code.   │   
  │                       │          │ Table is now orphaned dead weight.             │
  ├───────────────────────┼──────────┼────────────────────────────────────────────────┤   
  │ Google token columns  │ E        │ Added but nothing uses them. googleCalendar.ts │ 
  │ (migration 012)       │          │  is broken.                                    │   
  └───────────────────────┴──────────┴────────────────────────────────────────────────┘
                                                                                          
  ---                                                                                   
  Dead / Orphaned Code

  ┌────────────────────────────────────────────────┬──────────────────────────────────┐
  │                      Item                      │             Category             │
  ├────────────────────────────────────────────────┼──────────────────────────────────┤
  │ lib/googleCalendar.ts (syntax error, not       │ E                                │
  │ imported)                                      │                                  │
  ├────────────────────────────────────────────────┼──────────────────────────────────┤   
  │ components/ChakraProvider.tsx (not imported    │ E — Chakra is not part of the    │   
  │ anywhere)                                      │ stack                            │   
  ├────────────────────────────────────────────────┼──────────────────────────────────┤   
  │ /api/google/auth route file (missing,          │ E                                │ 
  │ referenced)                                    │                                  │   
  ├────────────────────────────────────────────────┼──────────────────────────────────┤
  │ approved_names table + admin management        │ E — Allowlist model abandoned    │   
  ├────────────────────────────────────────────────┼──────────────────────────────────┤   
  │ Google token columns on users table            │ E                                │
  ├────────────────────────────────────────────────┼──────────────────────────────────┤   
  │ /calendar "My Calendar" tab (placeholder)      │ E                                │ 
  ├────────────────────────────────────────────────┼──────────────────────────────────┤   
  │ Global ideas (/api/ideas, not plan-scoped)     │ C → likely E after ideas schema  │ 
  │                                                │ is fixed                         │   
  └────────────────────────────────────────────────┴──────────────────────────────────┘
                                                                                          
  ---                                                                                   
  Step 2: Load-Bearing Architecture Problems
                                            
  These are problems that will block the blueprint even after feature work is done.
                                                                                          
  1. ideas table has no plan-level scope
                                                                                          
  Severity: High. PRODUCT.md Feature #4 says ideas belong to a plan. The ideas table has  
  neither a poll_id column nor a clear FK to plans. Ideas are currently either
  free-floating (global) or pod-scoped. The entire ideas → voting → auto-schedule pipeline
   assumes ideas can be associated with a specific plan. Without this, auto-schedule    
  (Feature #5) can't work as described: "find the (time slot, activity) pair where the
  activity has 2+ upvotes and upvoters are available."

  Fixing this requires a schema migration (ideas.poll_id FK) and a new set of plan-scoped 
  idea API routes. The existing pod ideas system is separate and fine — the gap is
  plan-level ideas.                                                                       
                                                                                        
  2. Plan URLs use UUIDs, blueprint specifies slugs                                       
   
  Severity: Medium. Every existing plan URL is /polls/[uuid]. PRODUCT.md specifies        
  hangout.app/p/dinner-saturday-x7k — memorable slug + random suffix. Changing this is a
  breaking change for all existing plan links (iMessage links, bookmarks, shared URLs).   
  This needs a migration strategy (e.g., add a slug column, add a /p/[slug] route that  
  redirects to or replaces /polls/[id], keep /polls/[id] working as a fallback). The
  longer this waits, the more shared links exist that will break.

  3. Google Calendar is architecturally broken, not just buggy

  Severity: Medium (blocks a v1 must-ship). lib/googleCalendar.ts has a missing           
  catch/finally syntax error, the /api/google/auth OAuth route doesn't exist, and the
  Google token columns added in migration 012 are never read or written. This isn't a     
  small bug — the entire OAuth → token-store → calendar-read pipeline has never         
  functioned. It needs to be built from scratch, not fixed. Do not attempt incremental
  repairs on the current code.

  4. Anonymous identity is stored in localStorage, blueprint says cookies                 
   
  Severity: Low-Medium. PRODUCT.md explicitly: "we set a cookie to remember them on that  
  device." UserContext.tsx uses localStorage. This matters for the link flow: if a user 
  responds to a plan in a Safari in-app browser and then opens it in full Safari,         
  localStorage won't transfer but a cookie would. It also matters for the               
  anonymous-to-account migration (Feature #9, currently missing), which requires cookies
  to work across PWA and browser contexts. This is a quiet foot-gun that will make the
  anonymous responder experience worse than described.

  5. No plan expiration mechanism

  Severity: Low (doesn't affect current UX, creates database bloat). PRODUCT.md Design    
  Principle #4: "A plan disappears 30 days after its scheduled date unless an account
  holder pins it." There is no cron job, scheduled function, or soft-delete mechanism for 
  this. Every plan created stays forever. This needs either a Vercel Cron Function or a 
  Supabase scheduled job. Should be built before real users generate data you'll want to
  clean up.

  6. Dual ideas implementation with inconsistent voting                                   
   
  Severity: Medium. Pod ideas use a vote_count integer column (direct increment). Global  
  ideas count rows in idea_votes. These are different data models for the same concept. If
   they ever share UI components or feed into the same auto-schedule logic, they will     
  produce incorrect results. Pick one model (row-counting via idea_votes is more correct
  for concurrency) and consolidate.

  ---                                                                                     
  Step 3: Surprises and Open Questions
                                                                                          
  1. Weather feature (/api/weather) — what is it for?                                   
  Not in PRODUCT.md or GOALS.md. Open-Meteo is called somewhere. Where is this data       
  surfaced? If it's shown to help users decide meeting times, it's a nice-to-have that    
  adds no friction — but it's also scope creep since it's not in the blueprint. If it's   
  not surfaced anywhere, it's dead code. Needs a decision: cut it or explicitly add it to 
  the blueprint.                                                                        

  2. Was approved_names / the allowlist ever intentional product design?                  
  The table exists, migrations manage it, the admin panel surfaces it. At some point, the
  app was apparently invite-only at the account-creation level. That contradicts          
  PRODUCT.md's open sign-up model. The check has been removed from the sign-in code, but
  the table and admin UI still exist. Should the allowlist be formally deprecated (drop   
  the table, remove admin UI section) or was there a reason to keep it that isn't       
  documented?

  3. Where does auto-schedule actually live?                                              
  The Phase 1 audit didn't surface a clear /api/polls/[id]/schedule endpoint or the
  algorithm described in PRODUCT.md Feature #5. Either it exists and was missed, or it's  
  not built. This is a must-ship v1 feature. Needs verification before any more         
  ideas/polling work is done — the ideas → auto-schedule pipeline is the centerpiece of   
  the product.                                                                          

  4. Is there a pod_id on polls?
  PRODUCT.md: "A pod can create a plan that uses pod-member availability automatically."
  For this to work, polls must be linkable to pods. The audit didn't confirm whether      
  polls.pod_id exists. If it doesn't, pod-to-plan creation is also unbuilt.
                                                                                          
  5. The /calendar route is a strategic ambiguity.                                        
  PRODUCT.md says calendar sync is "read-only, lazy-fetched, one-way — used to pre-fill
  your unavailable slots when you respond to a plan." That's not a separate page; it's a  
  background utility. The existence of a /calendar top-level route implies we're building
  a calendar view, which directly contradicts the principle "Don't drift into a calendar  
  app." This route should either be deleted or repurposed as a settings/sync management 
  page (not a calendar display).

  6. No evidence of the 3-notification types being enforced.                              
  PRODUCT.md is explicit: only three notification types, ever — (1) someone responded to
  your plan, (2) plan auto-scheduled, (3) event tomorrow. The push_subscriptions table    
  exists. But are there guardrails in the code preventing other notification types from 
  being added? If not, this is a "noble intention, no enforcement" situation. The         
  notification system should be built with explicit allowlisting, not ad-hoc.           

  7. The plan landing page hasn't been tested with real strangers.                        
  GOALS.md lists this as the most critical open assumption: "that the link-to-respond flow
   is genuinely friction-free for non-account holders on mobile Safari." PRODUCT.md lists 
  it as step 1 in the build order. Per GOALS.md, this should be tested with 5 friends   
  before building anything else. Based on the conversation history, this test hasn't      
  happened yet. Every hour of engineering spent on pods, OG tags, and ideas is valuable 
  but secondary to this validation.

  ---
  Summary Scorecard

  ┌─────────────────────────────────┬───────┐
  │            Category             │ Count │
  ├─────────────────────────────────┼───────┤
  │ A — Keep as-is                  │ 8     │
  ├─────────────────────────────────┼───────┤
  │ B — Right direction, needs work │ 11    │                                             
  ├─────────────────────────────────┼───────┤
  │ C — Contradicts blueprint       │ 6     │                                             
  ├─────────────────────────────────┼───────┤                                             
  │ D — In blueprint, not built     │ 7     │
  ├─────────────────────────────────┼───────┤                                             
  │ E — Dead/orphaned, delete       │ 7     │                                           
  └─────────────────────────────────┴───────┘                                             
   
  The biggest gap: The entire plan-scoped surface (ideas per plan, auto-schedule, plan    
  slugs, anonymous cookie identity, plan expiration) is either missing or architecturally
  misaligned. The pod surface is over-built relative to where the product currently is in 
  the PRODUCT.md build order. That's not wrong — pods are real retention payload — but the
   core link-respond flow has more gaps than it appears.
