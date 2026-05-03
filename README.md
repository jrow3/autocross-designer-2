---
date: 2026-04-16
tags: [project, web-app, autocross, sveltekit, typescript]
status: active
type: project
tech: [sveltekit, svelte-5, typescript, mapbox, supabase]
---

# Autocross Course Designer

Browser-based tool for designing autocross courses with cone placement, driving lines, and measurement capabilities. Supports satellite imagery via Mapbox and custom image backgrounds.

Live at: https://designer.autox.tools

## Tech Stack
- SvelteKit + Svelte 5 runes + TypeScript
- Mapbox GL v3 for satellite map integration
- Supabase for cloud save/share (optional)
- Static adapter → GitHub Pages deployment
- GitHub Actions CI/CD

## Features
- Map mode (Mapbox satellite) and image mode (uploaded course images)
- Cone types: regular, pointer, start, finish, trailer, staging grid
- Gates with optional directional pointer cones
- Slaloms with configurable spacing/count
- Distance measurement, driving lines, course outlines
- Worker station placement, text notes
- Scale calibration for image mode
- Undo/redo, URL sharing, browser autosave
- Box selection, multi-element drag
- SVG and JSON export

## Related Projects
- [[autox-tools]] — SCCA design system and landing page
- [[autocross-rankings]] — SCCA driver ranking system
- [[scca-tools]] — SCCA financial analysis

## Source
Repo: `jrow3/autocross-designer-2`. Run `npm run dev` for local dev, `npm run build` for static output.
