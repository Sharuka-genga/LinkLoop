<<<<<<< HEAD
HEAD

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

A app that connects people.
=======
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
>>>>>>> origin/main
