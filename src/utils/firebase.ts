import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, LearningSession } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with explicit database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure real Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
// Force account selection so user is always prompted to choose their specific Google Account
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Operation Types for error diagnosis
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network unreachable.');
    }
  }
}
testConnection();

/**
 * Executes genuine Google Sign-In / Sign-Up with Firebase Auth
 */
export async function signInWithGoogle(): Promise<{
  firebaseUser: FirebaseUser;
  profile: UserProfile;
  isFirstTime: boolean;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Check if profile exists in Firestore
  const userDocPath = `users/${user.uid}`;
  let userDocSnap;
  try {
    userDocSnap = await getDoc(doc(db, 'users', user.uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userDocPath);
  }

  let isFirstTime = !userDocSnap.exists();
  let profile: UserProfile;

  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    const localOnboarded =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(`truncky_onboarded_${user.uid}`) === 'true';
    const hasClassAndLang =
      !!data.preferences?.targetClass &&
      data.preferences.targetClass.trim() !== '' &&
      Array.isArray(data.preferences?.languages) &&
      data.preferences.languages.length > 0;
    
    // Only treat as completed if explicitly true, in local storage, or preferences are already configured
    const isCompleted = !!data.onboardingCompleted || localOnboarded || hasClassAndLang;
    isFirstTime = !isCompleted;

    profile = {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || 'Parent',
      avatarUrl:
        user.photoURL ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
      isFirstTimeUser: isFirstTime,
      onboardingCompleted: isCompleted,
      preferences: data.preferences || {
        languages: ['English'],
        primaryLanguage: 'English',
        targetClass: '',
      },
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
      lastLoginAt: Date.now(),
    };

    // Update last login
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          lastLoginAt: serverTimestamp(),
          onboardingCompleted: isCompleted,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userDocPath);
    }
  } else {
    // New first-time user
    profile = {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || 'Parent',
      avatarUrl:
        user.photoURL ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
      isFirstTimeUser: true,
      onboardingCompleted: false,
      preferences: {
        languages: ['English'],
        primaryLanguage: 'English',
        targetClass: '',
      },
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    // Save initial profile
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'Parent',
        avatarUrl: profile.avatarUrl,
        onboardingCompleted: false,
        preferences: profile.preferences,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }
  }

  return { firebaseUser: user, profile, isFirstTime };
}

/**
 * Loads user profile directly from Firestore
 */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const userDocPath = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const localOnboarded =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(`truncky_onboarded_${userId}`) === 'true';
    const hasClassAndLang =
      !!data.preferences?.targetClass &&
      data.preferences.targetClass.trim() !== '' &&
      Array.isArray(data.preferences?.languages) &&
      data.preferences.languages.length > 0;
    const isCompleted = !!data.onboardingCompleted || localOnboarded || hasClassAndLang;

    return {
      id: userId,
      email: data.email || '',
      name: data.name || 'Parent',
      avatarUrl:
        data.avatarUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`,
      isFirstTimeUser: !isCompleted,
      onboardingCompleted: isCompleted,
      preferences: data.preferences || {
        languages: ['English'],
        primaryLanguage: 'English',
        targetClass: '',
      },
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
      lastLoginAt: data.lastLoginAt?.toMillis?.() || Date.now(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userDocPath);
  }
}

/**
 * Saves or updates user kid preferences in Firestore
 */
export async function saveUserKidPreferences(
  userId: string,
  preferences: {
    languages: string[];
    primaryLanguage: string;
    targetClass: string;
    childName?: string;
  }
): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`truncky_onboarded_${userId}`, 'true');
  }
  const userDocPath = `users/${userId}`;
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        preferences,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userDocPath);
  }
}

/**
 * Saves a completed learning session to the user's isolated Firestore subcollection
 */
export async function saveSessionToFirestore(
  userId: string,
  session: LearningSession
): Promise<void> {
  const sessionPath = `users/${userId}/sessions/${session.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'sessions', session.id), {
      ...session,
      savedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, sessionPath);
  }
}

/**
 * Loads all learning sessions for a specific user from Firestore
 */
export async function getUserSessionsFromFirestore(
  userId: string
): Promise<LearningSession[]> {
  const sessionsPath = `users/${userId}/sessions`;
  try {
    const q = query(collection(db, 'users', userId, 'sessions'), orderBy('startedAt', 'desc'));
    const snap = await getDocs(q);
    const sessions: LearningSession[] = [];
    snap.forEach((d) => {
      sessions.push(d.data() as LearningSession);
    });
    return sessions;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, sessionsPath);
  }
}

/**
 * Deletes a session from the user's isolated Firestore subcollection
 */
export async function deleteSessionFromFirestore(
  userId: string,
  sessionId: string
): Promise<void> {
  const sessionPath = `users/${userId}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, sessionPath);
  }
}

/**
 * Real sign out via Firebase
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
