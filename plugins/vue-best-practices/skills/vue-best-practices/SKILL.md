---
name: vue-best-practices
description: >
  Vue 3 + TypeScript best practices. Load for any .vue file, composable,
  Pinia store, or Vue-related task in any Vue 3 project. Covers component
  decomposition, composable patterns, provide/inject, Pinia, reactivity,
  SFC structure, and file size and architecture rules.
  Based on vuejs-ai/skills vue-best-practices.
---

# Vue 3 Best Practices — SignalCanvas

Stack: Vue 3 + `<script setup lang="ts">` + Pinia + Vitest. Read this before writing any `.vue` file or composable.

## Core Principles

- **Keep state predictable** — one source of truth, derive everything else with `computed`.
- **Make data flow explicit** — props down, events up by default.
- **If you can name it, extract it** — if a chunk of template or logic has a clear single purpose, it's a component or composable.
- **Extraction should simplify** — only extract if the result is cleaner than the original. If extraction requires threading a lot of props that make the code messier, keep it inline.
- **File size gates** — 700 lines is the hard ceiling. Under 500 is the target. If a `.vue` file is approaching 500 lines, look for what to extract next.

---

## 1. Plan component boundaries before coding

Before writing any non-trivial component, sketch the component map:

- Define each component's single responsibility in one sentence.
- **View/route components stay thin** — they wire composables and child components together. Feature logic and substantial UI blocks do not live in view components.
- Define props/emits contracts for each child upfront.
- Use a feature folder layout for multi-component features: `components/<Feature>/`, `composables/use<Feature>.ts`.

**Split a component when any of these are true:**
- It has more than one clear responsibility.
- It has 3+ distinct UI sections (form, list, toolbar, status bar, etc.).
- A template block is repeated or could be reused.
- The file is approaching 500 lines.
- A section of the template has a clear name — if you can name it, it's a component.

**Don't extract when:**
- Extraction requires threading so many props/emits that the result is harder to read than the original.
- The "component" is 3–5 lines with no meaningful reuse potential.

---

## 2. Reactivity — required reading

Read `references/reactivity.md` before working with reactive state.

Key rules:
- Use `shallowRef()` for primitives, `ref()` when you replace the whole value, `reactive()` when you mutate in place.
- `computed()` for all derived values — never `watchEffect` + manual assignment.
- Keep computed getters pure. Side effects go in `watch()`.
- Use `immediate: true` instead of duplicating initial calls in `onMounted`.
- When using `shallowRef` for objects, call `triggerRef()` after mutating nested properties.

---

## 3. SFC structure — required reading

Read `references/sfc.md` before writing `.vue` files.

Key rules:
- Order: `<script setup>` → `<template>` → `<style scoped>`.
- PascalCase for component names in templates and filenames.
- `<style scoped>` for component styles; class selectors only (not element selectors).
- No `v-if` and `v-for` on the same element — use a `computed` filter.
- Always provide a stable `:key` in `v-for` — prefer `item.id`, never index for stateful lists.

---

## 4. Component data flow — required reading

Read `references/component-data-flow.md` before wiring components together.

Key rules:
- **Props down, events up** is the default.
- **provide/inject with `InjectionKey<T>`** is the right pattern when a subtree needs shared context without prop drilling — not 40 props. See `references/component-data-flow.md` for the typed pattern.
- Keep mutations in the provider — consumers call actions, not mutate directly.
- Type all component boundaries: `defineProps<Props>()`, `defineEmits<Emits>()`, `InjectionKey<T>`.
- `v-model` via `defineModel()` for two-way bindings (Vue 3.4+).

**SignalCanvas provide/inject pattern:**
```ts
// useXxxContext.ts
import type { InjectionKey } from 'vue'

export interface XxxContext { /* all state + actions the subtree needs */ }
export const XXX_CTX_KEY: InjectionKey<XxxContext> = Symbol('xxxContext')

export function provideXxxContext(ctx: XxxContext) {
  provide(XXX_CTX_KEY, ctx)
}

export function useXxxContext(): XxxContext {
  const ctx = inject(XXX_CTX_KEY)
  if (!ctx) throw new Error('useXxxContext must be used inside XxxProvider')
  return ctx
}
```

Use this pattern whenever a parent component owns state that multiple children need — instead of passing it as props.

---

## 5. Composables — required reading

Read `references/composables.md` before writing `useX` functions.

Key rules:
- Composables own state and side effects. Pure utilities (formatters, math, transforms) are plain functions in `utils/`, not composables.
- Use an options object for composables with more than 2 parameters.
- Return `readonly()` state and explicit action functions — consumers should not mutate composable internals directly.
- Organize by feature concern — a composable for modal state, a composable for keyboard handling, etc. Not one giant composable for everything.
- Keep composables under 300 lines. If a composable is growing, split by concern.

---

## 6. Modals, overlays, and dialogs

Large modal layers extracted from view components use the provide/inject pattern:

1. **Create `useXxxModalContext.ts`** — typed `InjectionKey<XxxModalContext>` with `provideXxxModalContext` and `useXxxModalContext`.
2. **Create `XxxModalsLayer.vue`** — zero props, uses `useXxxModalContext()` to inject all state. Contains all modal/dialog/overlay declarations for that view.
3. **View component** calls `provideXxxModalContext(...)` and renders `<XxxModalsLayer />` — no modal imports needed in the view itself.

This keeps view components thin and makes the modal layer independently readable.

---

## 7. Pinia stores

- One store per domain (canvas scene, graph, user library, project pages, etc.).
- Stores hold shared state. Local component state stays in `ref`/`reactive` or composables.
- Use `shallowRef` + `triggerRef` for large normalized maps for performance.
- Never destructure store properties outside `storeToRefs()` — reactivity breaks.
- Stores are singletons. If you need per-instance state, use a composable, not a store.

---

## 8. No magic numbers

Every hardcoded value needs a named constant — including:
- Animation/transition durations (e.g. `const TAB_SWITCH_FIT_VIEW_DELAY_MS = 50`)
- Z-index layers
- Timeout values
- Padding/threshold constants used in logic

---

## 9. Testing

Run `npm run audit:tests` after every change. All tests must pass before committing.

- Test actual behavior — not internal implementation details.
- For Pinia stores: `setActivePinia(createPinia())` in `beforeEach`, `localStorage.clear()` if the store reads from localStorage on init.
- For composables with lifecycle hooks: use a wrapper component in tests.
- Do not use snapshot-only tests — they pass even when functionality is broken.

---

## 10. Final check before committing

- [ ] All files under 700 lines (ideally under 500)?
- [ ] Components have single responsibilities?
- [ ] View/route components are thin — no inline feature implementations?
- [ ] All reactive state uses the right primitive?
- [ ] No magic numbers?
- [ ] `npm run audit:tests` passes?
- [ ] No `rm` used? (`trash` only)
