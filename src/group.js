// Group Module — Create, Join, Manage Groups
import { db } from './firebase.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Create a new group
 */
export async function createGroup(name, user) {
  const groupRef = doc(collection(db, 'groups'));
  const groupData = {
    name: name.trim(),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    tasks: [],
    taskIcons: [],
    members: [user.uid],
    memberNames: { [user.uid]: user.displayName },
    memberPhotos: { [user.uid]: user.photoURL || '' },
    initialOrder: [],
    rotationStartDate: null,
    messages: [{
      text: `${user.displayName} created the group`,
      timestamp: Date.now(),
      type: 'system'
    }]
  };

  await setDoc(groupRef, groupData);
  return groupRef.id;
}

/**
 * Join an existing group
 */
export async function joinGroup(groupId, user) {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) {
    throw new Error('Group not found');
  }

  const data = groupSnap.data();

  // Check if already a member
  if (data.members.includes(user.uid)) {
    return data;
  }

  await updateDoc(groupRef, {
    members: arrayUnion(user.uid),
    [`memberNames.${user.uid}`]: user.displayName,
    [`memberPhotos.${user.uid}`]: user.photoURL || '',
    messages: arrayUnion({
      text: `${user.displayName} joined the room`,
      timestamp: Date.now(),
      type: 'join'
    })
  });

  return { ...data, id: groupId };
}

/**
 * Get group data
 */
export async function getGroup(groupId) {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) return null;
  return { id: groupId, ...groupSnap.data() };
}

/**
 * Get all groups the user belongs to
 */
export async function getUserGroups(uid) {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', uid)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Listen to real-time updates on a group
 */
export function listenToGroup(groupId, callback) {
  const groupRef = doc(db, 'groups', groupId);
  return onSnapshot(groupRef, (snap) => {
    if (snap.exists()) {
      callback({ id: groupId, ...snap.data() });
    }
  });
}

/**
 * Admin: Add tasks to the group
 */
export async function addTasks(groupId, tasks) {
  const groupRef = doc(db, 'groups', groupId);
  const taskNames = tasks.map(t => t.name);
  const taskIcons = tasks.map(t => t.icon);

  await updateDoc(groupRef, {
    tasks: taskNames,
    taskIcons: taskIcons
  });
}

/**
 * Admin: Start rotation (random first assignment)
 */
export async function startRotation(groupId, memberCount) {
  const groupRef = doc(db, 'groups', groupId);

  // Create a random initial order (shuffle indices 0..memberCount-1)
  const indices = Array.from({ length: memberCount }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  await updateDoc(groupRef, {
    initialOrder: indices,
    rotationStartDate: Timestamp.now()
  });
}

/**
 * Generate a WhatsApp share link
 */
export function getWhatsAppShareLink(groupId, groupName, baseUrl) {
  const joinUrl = `${baseUrl}?join=${groupId}`;
  const message = `🏠 Join my DoIT chore group "${groupName}"!\n\nClick to join: ${joinUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
