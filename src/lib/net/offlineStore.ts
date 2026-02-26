type Listener = () => void;

let navigatorOffline = false;
let requestIssues = false;
let lastOfflineAt = 0;
let failureTimestamps: number[] = [];
const listeners = new Set<Listener>();
let snapshot = { isOffline: false, lastOfflineAt: 0 };

const FAILURE_WINDOW_MS = 20000;
const FAILURE_THRESHOLD = 2;

function notify() {
  listeners.forEach((listener) => listener());
}

function updateSnapshot() {
  const next = {
    isOffline: navigatorOffline || requestIssues,
    lastOfflineAt,
  };
  snapshot = next;
}

export function getOfflineSnapshot() {
  return snapshot;
}

export function setNavigatorStatus(isOffline: boolean) {
  if (navigatorOffline === isOffline) return;
  navigatorOffline = isOffline;
  if (isOffline) {
    lastOfflineAt = Date.now();
  }
  updateSnapshot();
  notify();
}

export function markOffline() {
  if (!requestIssues) {
    requestIssues = true;
    lastOfflineAt = Date.now();
    updateSnapshot();
    notify();
  }
}

export function recordRequestFailure() {
  const now = Date.now();
  failureTimestamps = failureTimestamps.filter(
    (timestamp) => now - timestamp < FAILURE_WINDOW_MS,
  );
  failureTimestamps.push(now);

  if (!requestIssues && failureTimestamps.length >= FAILURE_THRESHOLD) {
    requestIssues = true;
    lastOfflineAt = now;
    updateSnapshot();
    notify();
  }
}

export function recordRequestSuccess() {
  failureTimestamps = [];
  if (requestIssues) {
    requestIssues = false;
    updateSnapshot();
    notify();
  }
}

export function subscribeOffline(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
