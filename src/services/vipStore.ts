import { VipPlan, VipUser, PaymentSettings, VipRequest, PhonePeInitiateResponse, PhonePeStatusResponse } from '../types/admin';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db, googleProvider } from './firebase';

const VIP_STORAGE_KEY = 'anizenx_vip_user_session';
const PLANS_STORAGE_KEY = 'anizenx_vip_plans_v1';

export const DEFAULT_VIP_PLANS: VipPlan[] = [
  {
    id: 'plan_starter',
    name: 'VIP Starter',
    priceInr: 99,
    priceUsd: 1.49,
    duration: '1 Month',
    durationDays: 30,
    features: [
      '100% Ad-Free site-wide streaming',
      'Instant video start (Zero prerolls)',
      '1080p Full HD High Bitrate stream',
      'Standard server access',
    ],
    active: true,
    color: 'rose',
  },
  {
    id: 'plan_pro',
    name: 'VIP Pro Otaku',
    priceInr: 249,
    priceUsd: 3.49,
    duration: '3 Months',
    durationDays: 90,
    badge: 'MOST POPULAR',
    features: [
      '100% Zero Ads (Prerolls, Banners, Popunders)',
      'Unlock ALL Premium Dubbed & Exclusive anime',
      'Priority Server Alpha (Ultra-fast 60fps)',
      'Simultaneous 4 screens streaming',
      'VIP Golden Crown badge on profile',
    ],
    active: true,
    color: 'amber',
  },
  {
    id: 'plan_yearly',
    name: 'VIP Ultimate Pass',
    priceInr: 799,
    priceUsd: 9.99,
    duration: '1 Year',
    durationDays: 365,
    badge: 'BEST VALUE (Save 50%)',
    features: [
      'Full 1-Year Unrestricted Access',
      'Zero Ads forever across all devices',
      'All 240+ anime & locked episodes unlocked',
      'Dedicated high-speed CDN routes',
      'VIP Discord Access & Episode Request priority',
    ],
    active: true,
    color: 'purple',
  },
  {
    id: 'plan_lifetime',
    name: 'Lifetime Otaku VIP',
    priceInr: 1999,
    priceUsd: 24.99,
    duration: 'Lifetime',
    durationDays: 36500,
    badge: 'LIFETIME LEGEND',
    features: [
      'Pay ONCE, enjoy VIP status FOREVER',
      '100% Ad-Free guarantee for life',
      'Unlock every season, episode, and movie',
      'Direct Support line & Custom avatar badge',
    ],
    active: true,
    color: 'emerald',
  },
];

const DEFAULT_FREE_USER: VipUser = {
  isVip: false,
  tier: 'Free Explorer',
  userId: 'guest_' + Math.random().toString(36).substring(2, 9),
  userName: 'Anime Explorer',
};

// In-memory state with immediate local cache restoration
let currentUser: VipUser = (() => {
  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.userId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading cached VIP user:', e);
  }
  return DEFAULT_FREE_USER;
})();

let currentPlans: VipPlan[] = (() => {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading VIP plans:', e);
  }
  return DEFAULT_VIP_PLANS;
})();

type VipListener = (user: VipUser) => void;
type PlansListener = (plans: VipPlan[]) => void;

const vipListeners: Set<VipListener> = new Set();
const plansListeners: Set<PlansListener> = new Set();

export function getVipUser(): VipUser {
  return currentUser;
}

export function getVipProfile(): VipUser {
  return currentUser;
}

export function isVipActive(): boolean {
  if (!currentUser.isVip) return false;
  if (currentUser.expiresAt === 'lifetime') return true;
  if (!currentUser.expiresAt) return true;
  return new Date(currentUser.expiresAt).getTime() > Date.now();
}

export function subscribeToVip(listener: VipListener): () => void {
  vipListeners.add(listener);
  // Trigger immediately with current state
  listener({ ...currentUser });
  return () => {
    vipListeners.delete(listener);
  };
}

function notifyVipChange() {
  try {
    localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(currentUser));
  } catch (e) {
    console.warn('Failed to save VIP user local cache:', e);
  }
  vipListeners.forEach((fn) => fn({ ...currentUser }));
}

export function getVipPlans(): VipPlan[] {
  return currentPlans;
}

export function saveVipPlans(plans: VipPlan[]): void {
  currentPlans = [...plans];
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(currentPlans));
  } catch (e) {
    console.warn('Failed to save VIP plans:', e);
  }
  plansListeners.forEach((fn) => fn([...currentPlans]));
}

export function subscribeToPlans(listener: PlansListener): () => void {
  plansListeners.add(listener);
  return () => plansListeners.delete(listener);
}

// ----------------- Firebase Auth & Real-Time Firestore Sync -----------------

let unsubscribeSnapshot: (() => void) | null = null;

// Initialize Google Sign-In & real-time document listener
onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        currentUser = {
          ...DEFAULT_FREE_USER,
          ...data,
          userId: user.uid,
          email: user.email || data.email || '',
          userName: user.displayName || data.userName || 'Anime Explorer',
          photoURL: user.photoURL || data.photoURL || '',
        } as VipUser;

        // Verify active VIP plan expiration
        if (currentUser.isVip && currentUser.expiresAt && currentUser.expiresAt !== 'lifetime') {
          if (new Date(currentUser.expiresAt).getTime() < Date.now()) {
            currentUser.isVip = false;
            currentUser.tier = 'Free Explorer (Expired)';
            // Soft-write update to Firestore
            setDoc(userDocRef, { isVip: false, tier: 'Free Explorer (Expired)' }, { merge: true })
              .catch((err) => console.error('Failed to auto-expire VIP in Firestore:', err));
          }
        }
        notifyVipChange();
      } else {
        // Document does not exist yet. Initialize it with authenticated user info
        const newUser: VipUser = {
          userId: user.uid,
          isVip: false,
          tier: 'Free Explorer',
          userName: user.displayName || 'Anime Explorer',
          email: user.email || '',
          photoURL: user.photoURL || '',
        };
        setDoc(userDocRef, newUser)
          .catch((err) => console.error('Failed to write initial user doc to Firestore:', err));
        
        currentUser = newUser;
        notifyVipChange();
      }
    }, (error) => {
      console.warn('Firestore user snapshot notice:', error);
      // Even if Firestore snapshot encounters error, keep authenticated session active
      currentUser = {
        ...currentUser,
        userId: user.uid,
        email: user.email || currentUser.email || '',
        userName: user.displayName || currentUser.userName || 'Anime Explorer',
        photoURL: user.photoURL || currentUser.photoURL || '',
      };
      notifyVipChange();
    });
  } else {
    // Guest Mode
    currentUser = {
      isVip: false,
      tier: 'Free Explorer',
      userId: 'guest_' + Math.random().toString(36).substring(2, 9),
      userName: 'Anime Explorer',
    };
    notifyVipChange();
  }
});

/**
 * Trigger Google OAuth login popup with browserLocalPersistence and fallback logic
 */
export async function loginWithGoogle(): Promise<any> {
  const provider = googleProvider;
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // Ensure persistence is set to browserLocalPersistence before popup launch
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err: any) {
    const code = err?.code || '';
    
    // Benign user cancellations / dismissals - do not log as fatal error or rethrow unhandled
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/user-cancelled'
    ) {
      console.info('[Google Auth] Sign-In popup closed or cancelled by user.');
      return null;
    }

    // Popup was blocked by browser or mobile in-app browser restrictions
    if (code === 'auth/popup-blocked') {
      const msg = 'Google Sign-In popup was blocked by your browser settings. Please allow popups for this site, or open this page in standard Chrome/Safari to sign in.';
      console.warn('[Google Auth]', msg);
      if (typeof window !== 'undefined' && window.alert) {
        alert(msg);
      }
      return null;
    }

    // Unauthorized domain in Firebase configuration
    if (code === 'auth/unauthorized-domain') {
      const msg = 'Current domain is not authorized in Firebase Auth configuration. Please add this domain under Firebase Console > Authentication > Settings > Authorized Domains.';
      console.error('[Google Auth]', msg);
      if (typeof window !== 'undefined' && window.alert) {
        alert(msg);
      }
      return null;
    }

    // Network / offline errors
    if (code === 'auth/network-request-failed') {
      const msg = 'Network error during Google Sign-In. Please check your internet connection and try again.';
      console.warn('[Google Auth]', msg);
      if (typeof window !== 'undefined' && window.alert) {
        alert(msg);
      }
      return null;
    }

    console.error('[Google Auth] Sign-In error:', err);
    if (typeof window !== 'undefined' && window.alert) {
      alert(`Sign-in could not be completed (${err?.message || 'Unknown error'}). Please try again.`);
    }
    return null;
  }
}

/**
 * Log out active Firebase user
 */
export async function logoutUser(): Promise<void> {
  try {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    await signOut(auth);
    try {
      localStorage.removeItem(VIP_STORAGE_KEY);
    } catch {}
    currentUser = {
      isVip: false,
      tier: 'Free Explorer',
      userId: 'guest_' + Math.random().toString(36).substring(2, 9),
      userName: 'Anime Explorer',
    };
    notifyVipChange();
  } catch (err) {
    console.error('Log out failed:', err);
    throw err;
  }
}

/**
 * strict Check if current logged-in user is the Super Admin
 */
export function isSuperAdmin(): boolean {
  return auth.currentUser?.email === 'sagars19585@gmail.com';
}

/**
 * Get active Firebase user
 */
export function getFirebaseUser() {
  return auth.currentUser;
}

/**
 * Activate VIP for the current user and write state directly to Firestore
 */
export function activateVipMembership(
  plan: VipPlan,
  paymentDetails: {
    method: 'phonepe_gateway' | 'upi' | 'card' | 'netbanking' | 'admin_grant';
    transactionId: string;
    payerName?: string;
    payerEmail?: string;
  }
): VipUser {
  const now = new Date();
  let expiresAt: string;

  if (plan.durationDays >= 36500) {
    expiresAt = 'lifetime';
  } else {
    const exp = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    expiresAt = exp.toISOString();
  }

  const updatedUser: VipUser = {
    isVip: true,
    tier: plan.name,
    planId: plan.id,
    planName: plan.name,
    activatedAt: now.toISOString(),
    expiresAt,
    userId: auth.currentUser?.uid || currentUser.userId || 'user_' + Math.random().toString(36).substring(2, 9),
    userName: paymentDetails.payerName || auth.currentUser?.displayName || currentUser.userName || 'VIP Otaku',
    email: paymentDetails.payerEmail || auth.currentUser?.email || currentUser.email || 'vip@anizenx.stream',
    paymentMethod: paymentDetails.method,
    transactionId: paymentDetails.transactionId,
  };

  if (auth.currentUser) {
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    setDoc(userDocRef, {
      ...updatedUser,
      updatedAt: now.toISOString()
    }, { merge: true })
      .then(() => console.log('Successfully saved VIP plan in Firestore'))
      .catch((err) => console.error('Failed to save VIP subscription in Firestore:', err));
  } else {
    // Local fallback for guest testing
    currentUser = updatedUser;
    notifyVipChange();
  }

  return updatedUser;
}

/**
 * Cancel or revoke VIP subscription
 */
export function cancelVipMembership(): void {
  const updatedUser = {
    ...currentUser,
    isVip: false,
    tier: 'Free Explorer',
    expiresAt: undefined,
  };

  if (auth.currentUser) {
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    setDoc(userDocRef, {
      isVip: false,
      tier: 'Free Explorer',
      expiresAt: null,
      updatedAt: new Date().toISOString()
    }, { merge: true })
      .then(() => console.log('Successfully revoked subscription in Firestore'))
      .catch((err) => console.error('Failed to revoke subscription in Firestore:', err));
  } else {
    currentUser = updatedUser;
    notifyVipChange();
  }
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  phonePeQrUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=500&q=80',
  upiId: 'anizenx@ybl',
  merchantId: 'M230628157582853',
  bankAccount: '921020038475821',
  ifscCode: 'UTIB0000214',
  accountHolder: 'AnizenX Premium Networks',
};

/**
 * Load payment settings from Firestore
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const docRef = doc(db, 'settings', 'payment');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PaymentSettings;
    }
  } catch (err) {
    console.error('Error fetching payment settings from Firestore:', err);
  }
  // Fallback to localStorage or default
  try {
    const local = localStorage.getItem('anizenx_payment_settings');
    if (local) return JSON.parse(local);
  } catch {}
  return DEFAULT_PAYMENT_SETTINGS;
}

/**
 * Save payment settings to Firestore
 */
export async function savePaymentSettings(settings: PaymentSettings): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'payment');
    const enriched = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, enriched);
    localStorage.setItem('anizenx_payment_settings', JSON.stringify(enriched));
  } catch (err) {
    console.error('Error saving payment settings to Firestore:', err);
    // fallback
    localStorage.setItem('anizenx_payment_settings', JSON.stringify(settings));
    throw err;
  }
}

/**
 * Submit manual VIP Request (Scan & Submit)
 */
export async function submitVipRequest(requestData: Omit<VipRequest, 'id' | 'status' | 'createdAt'>): Promise<VipRequest> {
  const id = 'REQ_' + Math.random().toString(36).substring(2, 11).toUpperCase();
  const newRequest: VipRequest = {
    ...requestData,
    id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'vip_requests', id);
    await setDoc(docRef, newRequest);
    return newRequest;
  } catch (err) {
    console.error('Error submitting manual VIP request to Firestore:', err);
    // local fallback storage for testing/guests
    try {
      const localReqs = JSON.parse(localStorage.getItem('anizenx_local_vip_requests') || '[]');
      localReqs.push(newRequest);
      localStorage.setItem('anizenx_local_vip_requests', JSON.stringify(localReqs));
    } catch {}
    return newRequest;
  }
}

/**
 * Get all VIP Manual Verification Requests
 */
export async function getVipRequests(): Promise<VipRequest[]> {
  try {
    const q = query(collection(db, 'vip_requests'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const requests: VipRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push(doc.data() as VipRequest);
    });
    return requests;
  } catch (err) {
    console.error('Error getting VIP requests from Firestore:', err);
    // local fallback
    try {
      return JSON.parse(localStorage.getItem('anizenx_local_vip_requests') || '[]');
    } catch {}
    return [];
  }
}

/**
 * Approve VIP request and activate the plan
 */
export async function approveVipRequest(request: VipRequest): Promise<void> {
  try {
    // 1. Update the request status in Firestore
    const requestDocRef = doc(db, 'vip_requests', request.id);
    await setDoc(requestDocRef, {
      ...request,
      status: 'approved',
      processedAt: new Date().toISOString(),
    });

    // 2. Activate membership for that target user
    const plan = currentPlans.find((p) => p.id === request.planId) || DEFAULT_VIP_PLANS[1];
    
    const userDocRef = doc(db, 'users', request.userId);
    const now = new Date();
    let expiresAt: string;
    if (plan.durationDays >= 36500) {
      expiresAt = 'lifetime';
    } else {
      expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const updatedUser: VipUser = {
      isVip: true,
      tier: plan.name,
      planId: plan.id,
      planName: plan.name,
      activatedAt: now.toISOString(),
      expiresAt,
      userId: request.userId,
      userName: request.userName,
      email: request.email,
      paymentMethod: 'upi_manual',
      transactionId: request.transactionId,
    };

    await setDoc(userDocRef, {
      ...updatedUser,
      updatedAt: now.toISOString()
    }, { merge: true });

    // Sync local store if approving our own request
    if (auth.currentUser && auth.currentUser.uid === request.userId) {
      currentUser = updatedUser;
      notifyVipChange();
    }
  } catch (err) {
    console.error('Error approving VIP request:', err);
    throw err;
  }
}

/**
 * Reject VIP request
 */
export async function rejectVipRequest(request: VipRequest, reason: string): Promise<void> {
  try {
    const requestDocRef = doc(db, 'vip_requests', request.id);
    await setDoc(requestDocRef, {
      ...request,
      status: 'rejected',
      processedAt: new Date().toISOString(),
      rejectReason: reason,
    });
  } catch (err) {
    console.error('Error rejecting VIP request:', err);
    throw err;
  }
}

/**
 * Initiate Direct Automated PhonePe Merchant Payment Intent
 */
export async function initiatePhonePePayment(
  plan: VipPlan,
  userDetails?: { payerName?: string; payerEmail?: string; mobileNumber?: string }
): Promise<PhonePeInitiateResponse> {
  const user = auth.currentUser;
  const userId = user?.uid || currentUser.userId || 'guest_' + Math.random().toString(36).substring(2, 9);
  const userName = userDetails?.payerName || user?.displayName || currentUser.userName || 'VIP Otaku';
  const email = userDetails?.payerEmail || user?.email || currentUser.email || 'vip@anizenx.stream';
  const mobileNumber = userDetails?.mobileNumber || '9999999999';

  try {
    const res = await fetch('/api/payment/phonepe-initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userName,
        email,
        planId: plan.id,
        planName: plan.name,
        amount: plan.priceInr,
        mobileNumber,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error || `Failed to initiate PhonePe payment (${res.status})`);
    }

    return data as PhonePeInitiateResponse;
  } catch (err: any) {
    console.error('PhonePe initiate error:', err);
    throw err;
  }
}

/**
 * Poll / Check live status of PhonePe payment transaction
 */
export async function checkPhonePePaymentStatus(txId: string): Promise<PhonePeStatusResponse> {
  try {
    const res = await fetch(`/api/payment/phonepe-status/${encodeURIComponent(txId)}`);
    const data = await res.json();
    return data as PhonePeStatusResponse;
  } catch (err: any) {
    console.error('PhonePe status check error:', err);
    return { success: false, status: 'pending' };
  }
}

/**
 * Trigger simulated PhonePe Webhook callback (for instant testing in sandbox/dev)
 */
export async function simulatePhonePeWebhook(
  merchantTransactionId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const targetUserId = userId || auth.currentUser?.uid || currentUser.userId;
    const res = await fetch('/api/payment/simulate-phonepe-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantTransactionId,
        userId: targetUserId,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('PhonePe simulate webhook error:', err);
    throw err;
  }
}



