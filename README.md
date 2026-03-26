# DoIT - Chore Tracker & Manager 🏠

DoIT is a responsive Progressive Web Application (PWA) designed to help roommates and families manage household chores fairly. It features real-time group collaboration, Google authentication, and an automated weekly chore rotation system.

## 🌟 Live Demo

**[https://doit-app-c2eeb.web.app/](https://doit-app-c2eeb.web.app/)**

---

## ✨ Features

- **Google Authentication:** Secure login using Firebase Auth.
- **Group Management:** Create private groups (households) and invite others.
- **WhatsApp Integration:** Generate a 1-click invite link directly to WhatsApp.
- **Auto-Join:** Magic URL parameters automatically place invited users into the correct group upon sign-in.
- **Automated Chore Rotation:** 
  - Admin defines the household tasks.
  - The system randomly assigns the initial task order.
  - Every week, the tasks mathematically rotate clockwise among members so everyone does their fair share.
- **Real-time Synchronization:** View member joins and task updates instantly via Firestore real-time listeners.
- **PWA Ready:** Installable on mobile devices (iOS/Android) for a native app feel.

---

## 🛠️ Tech Stack

- **Frontend Builder:** [Vite](https://vitejs.dev/)
- **Styling:** [TailwindCSS v3](https://tailwindcss.com/)
- **UI Architecture:** Vanilla JavaScript Single Page Application (SPA)
- **Backend/Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase Auth](https://firebase.google.com/docs/auth) (Google Provider)
- **Hosting:** [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

## 🗄️ Architecture & Data Model

The application leverages Firestore's NoSQL database with a single `groups` collection:

```typescript
groups/{groupId}
  ├── name: string                 // Display name for the group
  ├── createdBy: string (uid)      // Admin who created the group
  ├── createdAt: timestamp         // When the group was formed
  ├── tasks: string[]              // Array of chore names (e.g. "Kitchen Cleaning")
  ├── taskIcons: string[]          // Array of emoji icons corresponding to tasks
  ├── members: string[]            // Ordered array of user UIDs
  ├── memberNames: Object          // Map of UID -> Display Name
  ├── memberPhotos: Object         // Map of UID -> Profile Picture URL
  ├── initialOrder: number[]       // Randomly shuffled indices mapping tasks to members
  ├── rotationStartDate: timestamp // The exact moment rotation begins
  └── messages: Object[]           // Array of activity feed events (joins/creates)
```

### 🔄 The Rotation Algorithm

The core engine (`src/rotation.js`) ensures a fair workload:
1. When the admin clicks **Save & Start Rotation**, the app captures the `rotationStartDate` and generates a randomly shuffled `initialOrder` array.
2. When any user opens the app, it calculates the number of weeks that have passed since `rotationStartDate`.
3. It shifts the `initialOrder` array to the right by `(weekNumber - 1) % memberCount`.
4. This ensures that every member cycles through every task exactly once before the cycle repeats.

---

## 🚀 Local Setup & Development

### 1. Prerequisites
- Node.js (v18+)
- A Firebase Project with **Google Auth** and **Firestore** enabled.

### 2. Installation
```bash
# Clone the repository
# (Or navigate to the project directory)

# Install dependencies
npm install
```

### 3. Firebase Configuration
Open `src/firebase.js` and ensure your Firebase configuration object matches your project settings from the Firebase Console:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 📦 Building & Deploying

To build the project for production (including PWA asset generation):
```bash
npm run build
```

To deploy to Firebase Hosting:
```bash
# Ensure you are logged in
npx firebase-tools login

# Deploy only the hosting targets
npx firebase-tools deploy --only hosting
```

---

## 📱 Progressive Web App (PWA)

The app utilizes `vite-plugin-pwa` to auto-generate the service worker and manifest file. 
- It caches core assets (`js`, `css`, `html`, `ico`, `png`, `svg`) for faster load times.
- Provides an "Install App" button on compatible browsers (Chrome/Android).
- Uses `pwa-192x192.png` and `pwa-512x512.png` located in the `/public` directory for home screen icons.
