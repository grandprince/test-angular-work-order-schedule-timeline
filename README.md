# Work Order Schedule Timeline (Angular)

Single-page Angular application that visualizes and manages work orders across multiple work centers using an interactive timeline (Day / Week / Month).

---

## Requirements Covered

- Timeline grid with **Day / Week / Month** zoom levels
- Fixed left panel (Work Centers) + horizontally scrollable timeline grid
- Current time indicator + “Current month/week” badge (depending on view)
- Work order bars with status styling (Open / In progress / Complete / Blocked)
- Create / Edit slide-out drawer (Reactive Forms + validation)
- Actions menu (Edit / Delete)
- **Overlap detection** for work orders on the same work center (blocks save and shows error)
- Sample data: **5+ work centers**, **8+ work orders**, all statuses represented

---

## Tech Stack

- **Angular (latest)** — Standalone components, strict TypeScript, SPA layout
- **SCSS** — Pixel-oriented styling close to Sketch
- **Reactive Forms** — FormGroup validation for drawer fields
- **ng-select** — Styled dropdown for Timescale and Status
- **@ng-bootstrap/ng-bootstrap** — `ngb-datepicker` for start/end date selection
- **Vitest** (optional/bonus) — unit tests for key logic (if enabled)
- **Playwright** (optional/bonus) — E2E scenarios (if enabled)
- **localStorage persistence** (optional/bonus) — keeps work orders on refresh (if enabled)

---

## Setup

### Prerequisites

- **Node.js**: 24+ (tested on Node 24.14.0)
- **npm**: 11+

### Install

```bash
npm install
```

## Start (dev)

```bash
ng serve
```

or

```bash
npm start
```

Open:
http://localhost:4200

## Build

```bash
ng build
```

or

```bash
npm run build
```

## How to Test

### Unit Tests (Vitest)

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

UI mode:

```bash
npm run test:ui
```

### E2E Tests (Playwright)

First-time setup (one-time):

```bash
npx playwright install
```

Run E2E:

```bash
npm run e2e
```

UI mode:

```bash
npm run e2e:ui
```

View report:

```bash
npm run e2e:report
```
