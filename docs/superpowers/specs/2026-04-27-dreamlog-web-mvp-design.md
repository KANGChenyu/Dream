# DreamLog Web MVP Design

## Goal

Build the first visible DreamLog product experience as a Web MVP. The project currently has product documentation and a FastAPI backend skeleton, but no user-facing application. This MVP creates `dreamlog-frontend/` so a user can open a browser, log in, record dreams, and review saved dreams.

The design follows the visual standard in `Dream.png`: dark starry dreamscape, purple-blue lighting, glassmorphism panels, immersive center composition, and floating AI/community panels. The app should feel like an AI dream journal, not an admin dashboard.

## First Slice

The first slice is a personal dream journaling tool:

- Phone verification login using the existing backend development SMS flow.
- Dream entry form with content, dream date, mood, clarity, lucid dream flag, public flag, and anonymous flag.
- My dreams list with date, mood, title/content preview, and public/private state.
- Dream detail view with full dream metadata.
- AI interpretation and dream image areas shown as premium/coming-soon panels or disabled entry points until mock/real AI is connected.

Out of scope for the first slice:

- Community feed UI.
- Share card generation.
- Real AI interpretation or image generation.
- WeChat mini-program.
- Payment, membership, reports, statistics, and dream map.

## Technical Direction

Create a Vite + React + TypeScript app under `dreamlog-frontend/`.

Use the existing FastAPI backend at `http://localhost:8000`:

- `POST /api/v1/auth/sms/send`
- `POST /api/v1/auth/login/phone`
- `GET /api/v1/auth/me`
- `POST /api/v1/dreams`
- `GET /api/v1/dreams`
- `GET /api/v1/dreams/{dream_id}`
- `PUT /api/v1/dreams/{dream_id}`
- `DELETE /api/v1/dreams/{dream_id}`

Store the access token in local storage for the MVP. Wrap API calls in a small client module that attaches `Authorization: Bearer <token>`.

Use client-side routing. The initial route structure:

- `/login`
- `/` for the main journal workspace
- `/dreams/:id` for dream details

## Visual System

The UI should echo `Dream.png`:

- Full-screen dark cosmic background with purple/blue highlights.
- Large atmospheric title treatment for the first screen.
- Glass panels with translucent borders, soft blur, subtle glow, and compact content.
- Central dream entry area as the main interaction.
- Side panels for dream list, keywords, AI interpretation teaser, and mood insights.
- Responsive layout that collapses into a stacked mobile view.

Avoid a plain white SaaS dashboard style. Avoid a marketing-only landing page. The first screen should be usable as the journal workspace.

## Data Flow

Login:

1. User enters phone number.
2. Frontend calls `/auth/sms/send`.
3. In development, backend returns `debug_code`.
4. Frontend lets the user enter or auto-fill the code if returned.
5. Frontend calls `/auth/login/phone`.
6. Store token and user, then route to `/`.

Dream creation:

1. User fills the dream form.
2. Frontend validates minimum content length and required date.
3. Frontend calls `POST /dreams`.
4. On success, refresh list and show the created dream detail/preview.

Dream list/detail:

1. Main workspace loads `GET /dreams`.
2. Selecting a dream opens `/dreams/:id`.
3. Detail page calls `GET /dreams/{id}`.

## Error Handling

- Show inline validation for phone, code, dream content, and date.
- If login fails, keep the form state and show a short error.
- If API is unreachable, show a clear backend connection message.
- If token is invalid, clear auth state and return to login.
- If dream list is empty, show an inviting empty state that encourages first entry.

## Backend Assumptions

The backend may need small fixes before the frontend can work end to end:

- Dependencies must be installed or Docker must be used.
- Database tables must exist.
- CORS already includes `http://localhost:5173`.
- Development SMS returns `debug_code`.

If the backend cannot persist data yet, implementation should add the minimum backend migration/init path needed for the Web MVP.

## Testing And Verification

Verification should include:

- Frontend starts on `http://localhost:5173`.
- Login flow works against local backend.
- Creating a dream persists it.
- Dream list shows the created dream.
- Dream detail renders correct data.
- Browser verification at desktop and mobile widths confirms no overlapping text or broken panels.

## Implementation Plan Preview

1. Prepare backend local run path and confirm API availability.
2. Scaffold `dreamlog-frontend/` with Vite + React + TypeScript.
3. Build API client and auth state.
4. Build Dream.png-inspired visual shell.
5. Build login flow.
6. Build dream form, list, and detail views.
7. Add loading, empty, error, and unauthorized states.
8. Verify in browser and fix responsive issues.
