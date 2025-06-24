# Ketcher Canva: Step-by-Step Build Plan

## 1. Project Setup
- Initialize a new Next.js app (`npx create-next-app@latest ketcher-canva`)
- Change directory into the project folder
- Install dependencies:
  - `ketcher-react` and `ketcher-core` (for the editor)
  - `@supabase/supabase-js` (for Supabase integration)
  - `uuid` (for generating UUIDs if needed client-side)

## 2. Supabase Setup
- Use your existing Supabase project.
- Create a table named `canvases` with the following schema:
  - `id`: uuid, primary key, default value: `uuid_generate_v4()`
  - `ket`: text (to store the .ket string)
  - `created_at`: timestamp, default: now()
- Ensure Row Level Security (RLS) is set to allow public, anonymous access for reading and writing (for now).

## 3. Environment Variables
- Add your Supabase URL and anon key to a `.env.local` file in the Next.js project root:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://dqmwdeusrhbhqehmgoqx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbXdkZXVzcmhiaHFlaG1nb3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjMyNzQsImV4cCI6MjA2NTkzOTI3NH0.orUep8OxEKWFbIZYxuSsQQSyU2LWsgWAA00nwm4K7NU
  ```

## 4. Routing Structure
- Use Next.js dynamic routes: `/canvas/[id]`
  - `/canvas/new` → creates a new canvas (generates UUID, creates row in Supabase, redirects to `/canvas/[uuid]`)
  - `/canvas/[uuid]` → loads the canvas with the given UUID from Supabase

## 5. Ketcher Integration
- Import and render the `Ketcher` React component in your page/component.
- Use the `customButtons` prop to add two buttons:
  - "New Canvas" (icon: custom SVG)
  - "Share" (icon: custom SVG)
- Listen for `CUSTOM_BUTTON_PRESSED` events to handle button actions.

## 6. Button Logic
- **New Canvas:**
  - On click, POST to Supabase to create a new row with empty `ket`.
  - Redirect to `/canvas/[new_uuid]`.
- **Share:**
  - On click, get the current `.ket` string from Ketcher.
  - Save/update the `.ket` string in Supabase for the current UUID.
  - Copy the current URL to clipboard.

## 7. Canvas Loading Logic
- On `/canvas/[uuid]` page load:
  - Fetch the `.ket` string from Supabase for the given UUID.
  - If found, load it into Ketcher using the API.
  - If not found, show an error or redirect to `/canvas/new`.

## 8. SVG Icons
- Create simple SVGs for "New Canvas" (e.g., a plus or blank page) and "Share" (e.g., a link or share arrow).
- Place them in the `public/icons/` directory and reference in the `customButtons` prop.

## 9. Minimal UI
- The only UI should be the Ketcher editor with the two extra toolbar icons.
- No extra navigation, headers, or footers.

## 10. (Optional) Deployment
- Deploy to Vercel or similar for easy sharing.

---

**Next Steps:**
- [ ] Initialize Next.js app and install dependencies
- [ ] Set up Supabase table and RLS
- [ ] Add environment variables
- [ ] Implement routing and Ketcher integration
- [ ] Add custom buttons and logic
- [ ] Create SVG icons
- [ ] Test full flow: new canvas, share, reload

## Debugging & Troubleshooting Summary

The integration of `ketcher-react` with a modern Next.js (v14+) and React (v18+) stack presented several significant challenges, primarily related to Server-Side Rendering (SSR), dependency mismatches, and internal library race conditions. The following is a summary of the key issues and their solutions, which may be useful for future reference.

### 1. **Initial Problem: SSR Compatibility & "Worker is not defined"**
- **Symptom:** The application crashed on the server with `Worker is not defined` because `ketcher-standalone` uses Web Workers, which are browser-only APIs.
- **Solution:**
  - The `ketcher-react` `Editor` component and the `ketcher-standalone` `StandaloneStructServiceProvider` must be loaded *only on the client*.
  - This was achieved by using `next/dynamic` for the `Editor` component and instantiating the `StandaloneStructServiceProvider` only after confirming a browser environment (`typeof window !== 'undefined'`).

### 2. **Core Problem: Dependency Version Mismatch**
- **Symptom:** Even with client-side guards, persistent rendering and unmounting errors (`SVGLength`, `reading 'events'`) occurred.
- **Root Cause:** A thorough comparison with a known-working project revealed that `ketcher-react` (v3.4.0) has deep incompatibilities with React 19 and Next.js 15.
- **Solution:**
  - Downgraded the core dependencies in `package.json` to align with a stable environment:
    - `next`: `"14.0.0"`
    - `react`: `"^18"`
    - `react-dom`: `"^18"`
  - This required a clean install (`rm -rf node_modules package-lock.json && npm install`).

### 3. **Final Problem: Race Conditions in Development**
- **Symptom:** The editor would crash during navigation or on initial load, even with the correct dependencies.
- **Root Cause:** React's Strict Mode (`reactStrictMode: true`), which is on by default in Next.js development, intentionally double-invokes component effects to help find bugs. This was triggering a race condition in the Ketcher library's internal setup and cleanup logic.
- **Solution:**
  - **`reactStrictMode: false` was set in `next.config.js`.** This was the most critical fix and immediately stabilized the component's behavior.
  - A small, artificial delay (`setTimeout(..., 100)`) was added before calling `setMolecule` in the `onInit` handler. This ensures that all of Ketcher's internal services are fully initialized before its API is called, preventing a final race condition.

By addressing these three core issues, the application was made stable and fully functional.
