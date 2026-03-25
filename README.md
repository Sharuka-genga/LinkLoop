# LinkLoop

LinkLoop is an Expo and React Native mobile app for helping students discover, create, and join shared activities. The current product flow is focused on campus-friendly event coordination, with category-based discovery, event creation, and participant suggestions.

## What the app does

LinkLoop is designed to make it easier for people to find others for:

- Sports and fitness activities
- Study sessions and exam prep
- Food meetups and casual hangouts
- Gaming sessions
- Trips, campus events, and social activities
- Custom events that do not fit a preset category

The app currently presents a guided event creation flow:

1. Browse a home feed of sample events
2. Start creating a new event
3. Choose a category
4. Choose a subcategory or create a custom event
5. Fill in event details such as title, location, date, time, spots, and join mode
6. View suggested participants based on the selected category

## Current screens

- `Home`: Event feed with category filters and a create button
- `Category Selection`: Full-screen category carousel
- `Subcategory Selection`: Activity picker within a chosen category
- `Event Form`: Event details form with date, time, location, capacity, and join mode
- `Suggested Participants`: Match-style participant suggestions for invitations

## Tech stack

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase client
- `lucide-react-native` for icons
- `@react-native-community/datetimepicker` for date and time selection

## Project structure

The main app lives inside the `linkloop/` directory.

```text
linkloop/
├── app.json
├── lib/
│   └── supabase.ts
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── category.tsx
│   │   ├── subcategory.tsx
│   │   ├── event-form.tsx
│   │   └── suggested-participants.tsx
│   └── components/
│       └── EventCard.tsx
├── package.json
└── tsconfig.json
```

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- Expo Go on a mobile device, or an Android/iOS simulator

### Install dependencies

From the app directory:

```bash
cd linkloop
npm install
```

### Run the app

```bash
npm start
```

You can also use:

```bash
npm run android
npm run ios
npm run web
```

## Environment variables

The project includes a Supabase client in `linkloop/lib/supabase.ts` and expects these environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

At the moment, much of the app UI is powered by local mock data. Supabase is wired in at the client level, but the visible screens are not yet fully backed by live data flows.

## Status

Current state of the project:

- Core mobile UI flow is implemented
- Navigation is handled with Expo Router
- Event and participant data on the screens are currently mocked
- Supabase client setup exists for future backend integration

## Next logical improvements

- Persist events and participants in Supabase
- Add authentication and user profiles
- Replace mock suggestions with real matching logic
- Add validation, error states, and loading states
- Introduce notifications and event join/request handling

## Notes

- The repository root contains the mobile app as a nested project inside `linkloop/`
- The root `package-lock.json` is separate from the app's own `linkloop/package-lock.json`
- This README documents the current implementation, not an already fully productionized backend
