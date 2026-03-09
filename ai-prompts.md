# AI Prompts Log

This file documents key AI-assisted prompts and decisions used while implementing the Work Order Schedule Timeline.

- Confirm Angular 17+ compatibility for `@ng-select/ng-select` and `@ng-bootstrap/ng-bootstrap`.

- Recommend using Angular 21 with standalone components, strict TypeScript, and SCSS.

- A `TimelineService` responsible for zoom levels (day/week/month), visible date ranges, and px-per-day calculations.

- A simple overlap rule based on `[start, end)` intervals: `start < otherEnd && end > otherStart`.

- Suggest a clean layout with a fixed left column and horizontally scrollable timeline grid.
