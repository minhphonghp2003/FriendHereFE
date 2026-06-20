Initialize a new Next.js project using the latest stable version.

## General Requirements

- Use TypeScript
- Use App Router
- Use Server Components by default
- Use Client Components only when necessary
- Enable strict mode
- Use ESLint + Prettier
- Use absolute imports using "@/*"
- Use environment variables with validation
- Follow Clean Architecture principles
- Follow Feature-first folder organization
- Use SOLID principles
- Avoid code duplication
- Keep components small and reusable

---

## Styling

Use

- Tailwind CSS
- shadcn/ui
- class-variance-authority (CVA)
- clsx
- tailwind-merge

Create a reusable UI component library.

---

## State Management

Install

- Redux Toolkit
- React Redux

Use Redux only for global application state.

Do NOT use Redux for:

- server data
- form state

---

## Server State

Use

- TanStack Query

Configure

- QueryClientProvider
- Devtools (development only)
- sensible default caching

---

## Forms

Use

- React Hook Form
- Zod

Validation should use Zod.

---

## Authentication

Prepare architecture for JWT authentication.

Create

- AuthProvider
- AuthGuard
- Token storage abstraction
- Axios interceptor for access token

Do not implement authentication logic yet.

---

## HTTP Client

Use Axios.

Create

lib/http/

containing

- axios instance
- request interceptor
- response interceptor
- error handler

No axios calls should exist directly inside components.

---

## Folder Structure

src/

    app/
    components/
        ui/
        common/

    features/
        auth/
        home/
        profile/

    hooks/

    lib/
        axios/
        query/
        utils/

    store/
        slices/
        middleware/
        index.ts

    services/

    types/

    constants/

    config/

    providers/

    layouts/

---

## Feature Structure

Each feature should contain

feature/

    api/
    components/
    hooks/
    types/
    validation/
    services/

---

## Routing

Use App Router.

Layouts should be shared whenever possible.

---

## Error Handling

Implement

- Global Error Boundary
- Loading UI
- Not Found page

---

## Theme

Install next-themes.

Support

- Light
- Dark
- System

---

## Icons

Use lucide-react.

---

## Notifications

Use Sonner.

Create a global toaster.

---

## Code Style

Prefer

- Functional components
- Arrow functions
- Named exports
- Async/await

Avoid

- any
- default exports
- inline styles
- large components

---

## Performance

Use

- React.memo when appropriate
- dynamic import for heavy components
- Suspense
- Image optimization
- lazy loading

---

## Environment

Create

.env.example

Validate env using T3 Env (or Zod).

---

## Utilities

Create reusable utilities for

- formatDate
- formatCurrency
- debounce
- throttle
- className helper (cn)

---

## Hooks

Create reusable hooks

- useDebounce
- useLocalStorage
- useMediaQuery
- useTheme

---

## API Pattern

Do not call axios inside pages or components.

Instead use

features/users/api/getUsers.ts

Example

Page
    ↓

Custom Hook
    ↓

TanStack Query
    ↓

API Function
    ↓

Axios Client

---

## Redux

Create

store/

    index.ts
    hooks.ts

Example slices

- authSlice
- appSlice

Use RTK best practices.

---

## Quality

Use

- Husky
- lint-staged
- commitlint

Pre-commit should run

- eslint
- prettier
- typecheck

---

## Testing

Install

- Vitest
- React Testing Library

Configure testing environment.

---

## Aliases

Use

@/components
@/features
@/lib
@/hooks
@/store
@/types

---

## Final Result

After setup

- project should compile without errors
- folders should be created
- providers should already be wired in layout.tsx
- Redux should already work
- TanStack Query should already work
- Theme should already work
- Sonner should already work
- Axios should already work
- Example feature should be included to demonstrate the architecture

The generated project should be production-ready, scalable, and follow modern Next.js best practices.