# Codebase audits (historical)

Files `051126_phase*.md` are **November 2025** snapshots from a blueprint alignment review. They are useful background but **not authoritative** for current behavior.

| Topic | Audit says | Current state (May 2026) |
|-------|------------|---------------------------|
| Google OAuth routes | Missing | Implemented — see [../GOOGLE_CALENDAR.md](../GOOGLE_CALENDAR.md) |
| `lib/googleCalendar.ts` | Broken / unused | OAuth + `listBusyTimes`; pre-fill (HGT-29) not wired to UI |
| `/calendar` page | Placeholder | Removed; connect on `/profile` |
| Google token DB columns | Unused | Written on OAuth callback |

Verify against the live codebase and [../README.md](../README.md) before acting on audit recommendations.
