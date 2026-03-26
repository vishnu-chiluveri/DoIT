import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByoR1efZY5WUcUWJp3daqVx-UUL5WlWWI",
  authDomain: "doit-app-c2eeb.firebaseapp.com",
  projectId: "doit-app-c2eeb",
  storageBucket: "doit-app-c2eeb.firebasestorage.app",
  messagingSenderId: "376010947518",
  appId: "1:376010947518:web:6587da1589c8c9b4dd17ef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addDummyUser() {
  const groupsCol = collection(db, 'groups');
  const snapshot = await getDocs(groupsCol);
  
  if (snapshot.empty) {
    console.log("No groups found.");
    process.exit(0);
  }
  
  const group = snapshot.docs[0];
  const groupRef = doc(db, 'groups', group.id);
  
  console.log(`Adding dummy users to group: ${group.data().name} (${group.id})`);
  
  const dummyUser1 = "dummy-uid-1";
  const dummyUser2 = "dummy-uid-2";
  const dummyUser3 = "dummy-uid-3";
  
  await updateDoc(groupRef, {
    members: arrayUnion(dummyUser1, dummyUser2, dummyUser3),
    [`memberNames.${dummyUser1}`]: "Sai Theja",
    [`memberNames.${dummyUser2}`]: "Vaishnavi",
    [`memberNames.${dummyUser3}`]: "Anjali",
    messages: arrayUnion({
      text: "Sai Theja joined the room (mocked)",
      timestamp: Date.now(),
      type: 'join'
    }, {
      text: "Vaishnavi joined the room (mocked)",
      timestamp: Date.now(),
      type: 'join'
    }, {
      text: "Anjali joined the room (mocked)",
      timestamp: Date.now(),
      type: 'join'
    })
  });
  
  console.log("Dummy users added successfully!");
  process.exit(0);
}

addDummyUser().catch(console.error);
