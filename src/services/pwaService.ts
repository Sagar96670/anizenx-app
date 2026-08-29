// Progressive Web App (PWA) Install & Service Worker Service

let deferredPrompt: any = null;
let isAppInstalled = false;
const pwaListeners: Set<() => void> = new Set();

if (typeof window !== 'undefined') {
  // Check if already running standalone
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  ) {
    isAppInstalled = true;
  }

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    (window as any).deferredPrompt = e; // Store globally on window
    notifyListeners();
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    isAppInstalled = true;
    deferredPrompt = null;
    (window as any).deferredPrompt = null; // Clear global window storage
    notifyListeners();
  });

  // Register Service Worker
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('AnizenX PWA Service Worker Registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker Registration Failed:', err);
        });
    });
  }
}

function notifyListeners() {
  pwaListeners.forEach((fn) => fn());
}

export function subscribeToPwaState(listener: () => void): () => void {
  pwaListeners.add(listener);
  return () => pwaListeners.delete(listener);
}

export function initPwaService(): void {
  // Triggers checking standalone and initial PWA state
  if (typeof window !== 'undefined') {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      isAppInstalled = true;
      notifyListeners();
    }
  }
}

export function isPwaInstallable(): boolean {
  const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).deferredPrompt);
  return !!promptEvent && !isAppInstalled;
}

export function isPwaInstalled(): boolean {
  return isAppInstalled;
}

export async function promptPwaInstall(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' }> {
  const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).deferredPrompt);
  if (!promptEvent) {
    return { outcome: 'unavailable' };
  }

  try {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      isAppInstalled = true;
    }
    deferredPrompt = null;
    if (typeof window !== 'undefined') {
      (window as any).deferredPrompt = null;
    }
    notifyListeners();
    return { outcome: choice.outcome };
  } catch (err) {
    console.warn('Error launching PWA install prompt:', err);
    return { outcome: 'dismissed' };
  }
}
