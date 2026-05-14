# Morocco Crew Trip Board

A mobile-first shared trip dashboard for a seven-person Morocco trip. The app helps the crew track the itinerary, claim their traveler identity, update readiness statuses in real time, get readiness notifications, and keep shared trip photos in one place.

Live app: https://malikadeyemo95-star.github.io/morocco-crew-trip-board/

## Features

- Shared Morocco itinerary with event times, locations, notes, and alarm offsets.
- Traveler claiming so each device can lock to one person.
- Real-time readiness/status updates powered by Supabase Realtime.
- Notifications when everyone is ready for an event.
- Shared photo gallery with upload, download/save, and delete.
- Premium Morocco-inspired UI with mobile-first bottom navigation.
- iPhone-friendly layout, large touch targets, and reduced-motion support.

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Supabase Database, Realtime, and Storage
- GitHub Pages hosting
- Local Node static server for development

## Running Locally

```bash
node server.js
```

Then open:

```text
http://127.0.0.1:4200/index.html
```

## Configuration

The app reads Supabase settings from `config.js`. Use `config.example.js` as the template when setting up another environment.

```js
window.TRIP_CONFIG = {
  supabaseUrl: "YOUR_SUPABASE_URL",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

## Notes

This project is designed as a lightweight static web app so it can stay free to host on GitHub Pages while using Supabase for shared data and photo storage.
