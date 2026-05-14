# 🌿 EcoAlert — Pollution & Unsafe Area Reporting System

> A community-powered, real-time pollution reporting platform built for hackathons and beyond.

![EcoAlert](https://img.shields.io/badge/EcoAlert-v1.0-2d7a2d?style=for-the-badge&logo=leaflet)
![Firebase](https://img.shields.io/badge/Firebase-10.12-orange?style=for-the-badge&logo=firebase)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Google Auth | Sign in with Google via Firebase Authentication |
| 📢 Report Issues | Upload photo, pick location, choose type & severity |
| 🗺️ Live Map | Interactive Leaflet map with color-coded markers |
| 🔥 Heatmap | Density view of polluted areas |
| 🔔 Nearby Alerts | Get notified of pollution within 1km of you |
| 👍 Community Upvotes | Verify reports by upvoting |
| 📊 Analytics Dashboard | Charts, stats, type breakdowns |
| 🛡️ Admin Panel | Manage, resolve, or delete reports |
| 👤 User Profiles | Eco ranks, badges, personal report history |
| 🌙 Dark Mode | Full dark/light theme toggle |
| 📱 Responsive | Mobile-first design throughout |

---

## 🏗️ Project Structure

```
ecoalert/
├── index.html              ← Landing page
├── assets/
│   ├── favicon.svg
│   └── google-icon.svg
├── css/
│   ├── main.css            ← Global styles, dark mode, components
│   ├── index.css           ← Landing page styles
│   ├── map.css             ← Map page styles
│   ├── report.css          ← Report form styles
│   ├── dashboard.css       ← Analytics dashboard styles
│   ├── profile.css         ← User profile styles
│   └── admin.css           ← Admin panel styles
├── js/
│   ├── firebase-config.js  ← Firebase init + all exports
│   ├── auth.js             ← Google auth, sign in/out, auth state
│   ├── reports.js          ← Firestore CRUD for reports
│   ├── map.js              ← Leaflet map logic, markers, heatmap
│   ├── utils.js            ← Helpers, toasts, constants, dummy data
│   └── pages/
│       ├── index.js        ← Landing page logic
│       ├── map-page.js     ← Map page logic
│       ├── report-page.js  ← Report form logic (multi-step)
│       ├── dashboard-page.js ← Charts & analytics logic
│       ├── profile-page.js ← User profile logic
│       └── admin-page.js   ← Admin panel logic
└── pages/
    ├── map.html
    ├── report.html
    ├── dashboard.html
    ├── profile.html
    └── admin.html
```

---

## 🚀 Setup Instructions

### Step 1 — Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** → name it `ecoalert` → Continue
3. Disable Google Analytics (optional) → **Create project**

### Step 2 — Enable Firebase Services

#### Authentication
1. Sidebar → **Build → Authentication → Get started**
2. **Sign-in method** tab → Enable **Google** → Save

#### Firestore Database
1. Sidebar → **Build → Firestore Database → Create database**
2. Choose **Start in test mode** (for development)
3. Pick a region close to your users → Enable

#### Storage
1. Sidebar → **Build → Storage → Get started**
2. Start in test mode → Next → Done

### Step 3 — Get Your Firebase Config

1. Sidebar → ⚙️ **Project Settings** → **Your apps** tab
2. Click **`</>`** (Web) → Register app as `ecoalert-web`
3. Copy the `firebaseConfig` object

### Step 4 — Add Config to the Project

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",           // ← your actual key
  authDomain: "ecoalert-xyz.firebaseapp.com",
  projectId: "ecoalert-xyz",
  storageBucket: "ecoalert-xyz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 5 — Set Firestore Security Rules

In Firebase Console → **Firestore → Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read all reports, write only if authenticated
    match /reports/{reportId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 6 — Set Storage Rules

In Firebase Console → **Storage → Rules**, paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reports/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### Step 7 — Run the Project

This is a pure HTML/CSS/JS project — **no build step needed!**

```bash
# Option A: Python (built-in)
python3 -m http.server 8080
# Open http://localhost:8080

# Option B: Node.js
npx serve .
# Open http://localhost:3000

# Option C: VS Code
# Install "Live Server" extension → Right-click index.html → "Open with Live Server"
```

> ⚠️ **Must use a local server** — ES modules don't work with `file://` protocol.

---

## 🛡️ Making a User an Admin

After someone signs in, go to:

**Firebase Console → Firestore → users → `<their-uid>` → Edit `role` field → Set to `"admin"`**

Or use the Firebase Admin SDK / Console directly.

---

## 🗃️ Firestore Schema

```
Collection: reports
└── {reportId}
    ├── userId         : string
    ├── userName       : string
    ├── userPhotoURL   : string
    ├── type           : "garbage"|"waterlogging"|"smell"|"air"|"drainage"|"road"|"smoke"
    ├── description    : string
    ├── severity       : "low"|"medium"|"high"|"critical"
    ├── status         : "active"|"in-progress"|"resolved"
    ├── imageURL       : string
    ├── location
    │   ├── lat        : number
    │   ├── lng        : number
    │   └── address    : string
    ├── upvotes        : number
    ├── upvotedBy      : array<string>
    ├── createdAt      : Timestamp
    ├── updatedAt      : Timestamp
    └── isDeleted      : boolean

Collection: users
└── {uid}
    ├── uid            : string
    ├── email          : string
    ├── displayName    : string
    ├── photoURL       : string
    ├── role           : "user"|"admin"
    ├── reportsCount   : number
    └── joinedAt       : Timestamp
```

---

## 🎨 Demo Mode

If Firebase is **not configured**, EcoAlert automatically falls back to **built-in dummy data** (6 sample reports around Mumbai). All map, dashboard, and filter features work in demo mode — perfect for presentations!

---

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Map | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap |
| Heatmap | [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) |
| Backend | Firebase (Serverless) |
| Database | Cloud Firestore |
| Auth | Firebase Authentication (Google) |
| Storage | Firebase Storage |
| Geocoding | OpenStreetMap Nominatim API |

---

## 📱 Pages

| URL | Description |
|---|---|
| `/index.html` | Landing page with hero, issue types, recent reports |
| `/pages/map.html` | Live interactive map with filters, heatmap, nearby alerts |
| `/pages/report.html` | 3-step report submission form |
| `/pages/dashboard.html` | Analytics with charts and full reports table |
| `/pages/profile.html` | User profile with badges and report history |
| `/pages/admin.html` | Admin panel to manage all reports |

---

## 🏆 Hackathon Tips

- **Demo-ready out of the box** — dummy data loads automatically without Firebase
- **Mobile-first** — fully responsive, works great on phones
- **Dark mode** — toggle in top navbar
- **Deep linking** — `map.html?type=garbage` or `map.html?reportId=xyz` work
- **No build tools** — just open with Live Server and go

---

## 📄 License

MIT — Free to use, modify, and distribute.

---

Built with 💚 for a cleaner world.
