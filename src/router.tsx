import { createRouter } from '@tanstack/react-router'
import { RouteErrorPage } from '@/components/error-pages'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Hosted under a subpath (GitHub Pages) the base is '/<repo>'; locally it is '/'.
const base = import.meta.env.BASE_URL.replace(/\/+$/, '')

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    basepath: base || '/',
    routeTree,
    defaultErrorComponent: RouteErrorPage,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
