import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN_HERE",
  databaseURL:       "PASTE_YOUR_DATABASE_URL_HERE",
  projectId:         "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId:             "PASTE_YOUR_APP_ID_HERE",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const eventsRef    = ref(db, "calendar/events");
export const savedRef     = ref(db, "calendar/saved");
export const discoverRef  = ref(db, "calendar/discover");
export const wishlistRef  = ref(db, "calendar/wishlist");
export const birthdaysRef = ref(db, "calendar/birthdays");
export const goalsRef     = ref(db, "calendar/goals");
export const chatRef      = ref(db, "calendar/chat");
export const tennisRef    = ref(db, "calendar/tennis");
export const runningRef   = ref(db, "calendar/running");
export { onValue, set, db };
