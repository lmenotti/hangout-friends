/** Plan respond pages: anonymous link-first flow with no app chrome. */
export function isPlanRespondPage(pathname: string): boolean {
  return pathname.startsWith('/p/') || (pathname.startsWith('/polls/') && pathname !== '/polls/new')
}

/** Pages where anonymous users should not see the global NameModal. */
export function isAnonymousPlanPage(pathname: string): boolean {
  return pathname.startsWith('/p/') || pathname.startsWith('/polls/')
}
