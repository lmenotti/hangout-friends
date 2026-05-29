
Phase 3 — Recommendations and Sequencing  

  ---                                                                                                                                                                                                           
  Part 1: The Single Most Important Thing
                                                                                                                                                                                                                
  Run the five-friend teardown test on mobile Safari and fix everything it breaks.                                                                                                                            

  Not the most glamorous recommendation, but the audit is unambiguous: the link-respond flow — the thing PRODUCT.md calls "the make-or-break surface" and GOALS.md calls "the riskiest technical assumption" —  
  has never been tested with anyone who doesn't already know how it works. Everything else in this codebase is retention payload for users who don't yet exist. The pod dashboard, the OG tags, the
  auto-schedule routes — all of that is downstream of someone successfully tapping a link and marking their availability in under 30 seconds without confusion.                                                 
                                                                                                                                                                                                              
  This recommendation isn't "think about the link flow." The concrete deliverable is: send a plan link to five people who have never seen the app, watch them try to respond to it on their phones (do not help 
  them), and fix every point where someone paused, asked a question, or failed. Then repeat until it's effortless. When you're done, you'll have verified the core product assumption, surfaced a concrete list
  of UX bugs, and produced something you can hand to the first Berkeley club. You'll also have confirmed or invalidated whether the anonymous identity (currently localStorage, not cookies as PRODUCT.md       
  specifies), the availability grid, and the name-entry flow actually work as described. The fixes will take at most a few sessions; the test itself is one afternoon.                                        

  The alternative argument is that plan-scoped ideas don't exist and auto-schedule is broken, so the product loop never closes even if the link flow works. That's true, but it's the wrong frame. If five      
  people can't mark availability without help, you don't have a scheduling product yet — you have a form that needs more work. The ideas and auto-schedule features only matter once someone is already using
  the availability-marking surface. Fix the foundation before adding floors.                                                                                                                                    
                                                                                                                                                                                                              
  ---
  Part 2: If You Have More Time
                               
  These are ranked by the ratio of value delivered to engineering effort. Each can be done in isolation; none requires the others to be complete first.
                                                                                                                                                                                                                
  1. Delete the dead code (2–3 hours)                                                                                                                                                                           
                                                                                                                                                                                                                
  Drop the approved_names table with a migration, remove its admin UI section and API routes, delete lib/googleCalendar.ts, components/ChakraProvider.tsx, the orphaned Google token columns, the /calendar     
  route and page, and the global ideas API (/api/ideas). This is already decided per Phase 2's resolutions — you're just executing on it.                                                                     
                                                                                                                                                                                                                
  This earns a top ranking not because it's exciting but because every future Claude Code session on this codebase currently has to mentally filter out ~200 lines of dead or broken code that look real.       
  Removing it makes the codebase smaller and the architectural picture clearer. Success is measurable: npm run build still passes, the admin panel still works without the approved_names section, and grep -r 
  "approved_names" . returns nothing.                                                                                                                                                                           
                                                                                                                                                                                                              
  2. Replace localStorage identity with a cookie (2–3 hours)

  PRODUCT.md is explicit: "we set a cookie to remember them on that device." UserContext.tsx uses localStorage. This is a quiet failure because localStorage doesn't transfer between a Safari in-app browser   
  (where a link opens from iMessage) and full Safari. A user who responds to a plan from the iMessage-embedded browser and then opens full Safari to check back won't be recognized. Cookies work across both
  contexts.                                                                                                                                                                                                     
                                                                                                                                                                                                              
  The change is contained to UserContext.tsx and whatever reads/writes the current localStorage key. Success looks like: open a plan link in iMessage on a real iPhone, mark availability, close the in-app     
  browser, open the same URL in Safari, and see your previous response still selected without being asked to re-enter your name. This directly unblocks the anonymous-to-account migration feature (PRODUCT.md
  Feature #9) whenever that gets built.                                                                                                                                                                         
                                                                                                                                                                                                              
  3. Verify OG tag rendering in iMessage, Discord, WhatsApp (1–2 hours)                                                                                                                                         
   
  The OG tags were built in the previous session but have never been tested in the actual sharing surfaces. PRODUCT.md Feature #7 calls this "a 1-day engineering task that pays for itself a hundred times" —  
  but it only pays off if the previews actually render. iMessage, Discord, WhatsApp, and Slack all have quirks in how they scrape OG data and how they size images.                                           
                                                                                                                                                                                                                
  The work here is mostly testing and fixing, not building. Send plan links in each platform, screenshot what renders, fix anything broken (wrong image dimensions, title truncated, no preview at all).        
  Success: a plan link dropped in iMessage shows the plan name, a readable subtitle, and the CTA button in the OG card. This is also the first real validation that the /api/og endpoint works correctly in
  production.                                                                                                                                                                                                   
                                                                                                                                                                                                              
  4. Build plan-scoped ideas and verify auto-schedule (5–8 hours — bigger than it looks)                                                                                                                        
   
  This is the item that closes the product loop described in PRODUCT.md. Right now, ideas has no poll_id column, so there are no plan-level ideas. The auto-schedule routes (/api/auto-schedule) were built for 
  the global ideas system and may or may not be usable for plan-scoped ideas without a rewrite. Until this is done, the full lifecycle (share link → mark availability → add ideas → auto-schedule → RSVP)    
  cannot be demonstrated end-to-end.                                                                                                                                                                            
                                                                                                                                                                                                              
  The work is: one migration adding poll_id to ideas, new /api/polls/[id]/ideas routes for CRUD and voting, reading the existing auto-schedule logic carefully to determine whether it can be pointed at        
  plan-scoped ideas or needs a rewrite, and surfacing the ideas board on the plan landing page. Be warned: the auto-schedule logic verification alone could take a session if the algorithm is wrong or makes
  assumptions that don't hold for plan-scoped ideas. Don't start this expecting it to be quick.                                                                                                                 
                                                                                                                                                                                                              
  5. Update PRODUCT.md to reflect weather and commute-aware scheduling (30 minutes)                                                                                                                             
   
  The Phase 2 audit flagged /api/weather and commute-time estimation as unspecified in the blueprint. They've been clarified as intentional. PRODUCT.md's description of auto-schedule (Feature #5) says only   
  "find the (time slot, activity) pair where the activity has 2+ upvotes and upvoters are available." The actual algorithm is smarter — weather penalizes outdoor activities in bad slots, commute time adjusts
  effective availability overlap. That gap between spec and implementation means future work (and future Claude Code sessions) will treat these features as scope creep candidates. Update the spec to match the
   code so the blueprint is accurate.                                                                                                                                                                         

  ---
  Part 3: Decisions You Need to Make
                                    
  Should you migrate URLs from /polls/[uuid] to /p/[slug] now?
                                                                                                                                                                                                                
  The audit found that plan URLs use full UUIDs at /polls/[id]. PRODUCT.md specifies memorable slugs at /p/dinner-saturday-x7k.                                                                                 
                                                                                                                                                                                                                
  Option A: Migrate now. Add a slug column to polls, generate slugs for existing rows, add a /p/[slug] route, redirect /polls/[uuid] to /p/[slug] permanently. Cost: roughly a session (migration + route +     
  redirect). Risk: low, since few real shared links exist today.                                                                                                                                              
                                                                                                                                                                                                                
  Option B: Migrate later. Keep the current URLs, revisit when there are real users with real shared links to break. Cost: nothing now. Risk: the migration gets harder with every month of real usage, and the 
  iMessage-aesthetic argument for slugs (short, readable links preview better) is lost for all links shared in the meantime.
                                                                                                                                                                                                                
  Option C: Never migrate. Accept UUIDs as the permanent URL structure. Cost: nothing. Risk: you live with the gap between spec and product forever, and future features like "copy link" produce ugly strings. 
   
  My recommendation is Option A, now, specifically because there's no significant user base today. Once real links live in real iMessage threads, migration has real blast radius. The engineering cost now is  
  low and the URL structure change is permanent. The one caveat: verify that any links already shared publicly (in testing, in any Berkeley club communications) are either still valid via redirect or       
  acceptably broken.                                                                                                                                                                                            
                                                                                                                                                                                                              
  Should you consolidate the dual ideas implementation now or after building plan-scoped ideas?

  The audit found two implementations: pod ideas use a vote_count integer column; global ideas count rows in idea_votes. Neither is plan-scoped. Building plan-scoped ideas adds a third variant.               
   
  Option A: Consolidate first, then build plan-scoped. Pick one voting model (row-counting via idea_votes is more correct for concurrent updates), port pod ideas to use it, delete the duplicate. Then build   
  plan-scoped ideas fresh in the consolidated model.                                                                                                                                                          
                                                                                                                                                                                                                
  Option B: Build plan-scoped ideas fresh, then consolidate. Build the plan ideas system correctly from scratch, then migrate pod ideas to match the same model, then delete global ideas.                      
   
  Option C: Leave the split in place indefinitely. Don't consolidate; manage three separate implementations.                                                                                                    
                                                                                                                                                                                                              
  Option C is clearly wrong — three voting implementations will produce correctness bugs once auto-schedule needs to aggregate across them. Between A and B: Option B is better because it lets you design the  
  plan-scoped ideas model correctly for its actual use case (tied to a poll, not a pod), and then you'll know what the "right" model looks like before you port pod ideas to match. Option A risks consolidating
   onto a model that then needs to be changed again when plan-scoped ideas have different requirements. My recommendation is Option B.                                                                          
                                                                                                                                                                                                              
  Should you update PRODUCT.md to formally include weather/commute auto-scheduler features?                                                                                                                     
   
  Yes. This isn't a real decision. The code is more sophisticated than the spec; that's a documentation debt that will cause future confusion. Update PRODUCT.md's auto-schedule section to describe the actual 
  algorithm. Thirty minutes of work that prevents weather and commute features from being flagged as scope creep in every future audit.                                                                       
                                                                                                                                                                                                                
  What to do with the over-built pod surface?                                                                                                                                                                 

  Pods are build-order step 6 in PRODUCT.md. The current codebase has a 4-tab pod dashboard, pod ideas with voting, pod events with RSVPs, invite codes, and member management. That's ahead of where the       
  overall product is in the build order (you're currently at step 1: "audit and fix the link-respond flow").
                                                                                                                                                                                                                
  Option A: Freeze intentionally. No new pod features until the link-respond flow is validated and steps 2–5 of the build order are complete. Let the existing pod surface stabilize; don't grow it.            
   
  Option B: Deprioritize but allow opportunistic work. Don't actively prioritize pod work, but if a pod bug or small improvement is easy, allow it.                                                             
                                                                                                                                                                                                              
  Option C: Keep building pods. The pod surface is mostly working; continue extending it.                                                                                                                       
                                                                                                                                                                                                              
  Option C actively works against the product. Pods are retention payload for users who first come through the link flow. Building more pod features before the link flow is proven means you're building       
  retention infrastructure for a user base that doesn't yet exist. My recommendation is Option A. Freeze the pod surface deliberately. This also means resisting the urge to add the pod-level analytics feature
   (availability heat map), which is in PRODUCT.md Surface 2 but has no business being prioritized now.                                                                                                         
                                                                                                                                                                                                              
  ---
  Part 4: What to Deliberately Not Do
                                                                                                                                                                                                                
  Don't build more pod features. The pod surface is already at step 6 of a 10-step build order while step 1 isn't done. Any engineering time spent on pods is time not spent validating the core assumption. The
   pod dashboard is functional and useful — it does not need pod-level analytics, recurring event patterns, pod-level notification settings, or any other extension until the plan landing page has been tested 
  and validated with real strangers. The way to say no to pod feature ideas is to say: "we haven't validated that anyone is coming through the link yet; who would use this?"                                 
                                                                                                                                                                                                                
  Don't fix the Google Calendar code — plan to rewrite it later. lib/googleCalendar.ts has a syntax error, the OAuth route doesn't exist, and the token storage added in migration 012 has never been used. This
   isn't a bug that can be patched; it's a feature that was never built. A rewrite is a multi-session project that should happen at step 7 of the build order — after the link flow, OG tags, mobile grid, PWA,
  notifications, and pods are working. Starting the Google Calendar work now would mean spending significant time on a background utility feature while the core product remains untested. When you do build it,
   start from scratch; don't try to salvage the current file.                                                                                                                                                 

  Don't build the ICS export. It's in the blueprint (build order step 8) and it's a good idea, but it's explicitly downstream of calendar sync (step 7), which is downstream of everything else. An ICS download
   button isn't available to any real user today and won't be for a while. It's the kind of "small, contained task" that feels like productive procrastination but isn't. Skip it until the build order reaches
  it.                                                                                                                                                                                                           
                                                                                                                                                                                                              
  Don't add notification types beyond the sanctioned three. The three-notification system isn't even built yet — the push infrastructure exists but no dispatch code does. Before extending it, it needs to be  
  built correctly, with explicit allowlisting of the three types to prevent scope creep. Resist any feature idea that involves notifying users about something other than (1) someone responded to your plan,
  (2) your plan got scheduled, (3) your event is tomorrow. Notification overload is the documented Achilles heel of every competing app in this category.                                                       
                                                                                                                                                                                                              
  Don't build the iMessage extension. GOALS.md is direct: "a real engineering project, real Apple Developer Program friction." PRODUCT.md lists it as explicitly deferred until the link flow is validated. The 
  link flow isn't validated. The iMessage extension will be a significant distribution multiplier if it works — which is exactly why it should wait until there's a validated flow worth amplifying.
                                                                                                                                                                                                                
  Don't verify or extend auto-schedule before plan-scoped ideas exist. The existing auto-schedule routes were built against the global ideas system, which is being deleted. Optimizing or fixing code that will
   be replaced is waste. The right time to evaluate auto-schedule correctness is when building the plan-scoped ideas system — you'll need to read the algorithm at that point anyway to determine what's worth
  keeping.