import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDhQG0mSAxBy9IjwSo9pUVWeVLjEdG1qaU",
  authDomain: "calendar-316b9.firebaseapp.com",
  databaseURL: "https://calendar-316b9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "calendar-316b9",
  storageBucket: "calendar-316b9.firebasestorage.app",
  messagingSenderId: "971964173280",
  appId: "1:971964173280:web:68a1c36050190fddc67985"
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
export const notesRef     = ref(db, "calendar/notes");
export { onValue, set, db };
