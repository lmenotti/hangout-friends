import { isPlanRespondPage } from '@/lib/planRoutes'

export function shouldHideAppChrome(pathname: string, showPlanAppChrome: boolean): boolean {
  return isPlanRespondPage(pathname) && !showPlanAppChrome
}
