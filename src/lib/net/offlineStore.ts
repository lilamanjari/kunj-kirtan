type Listener = () => void;

let navigatorOffline = false;
let requestIssues = false;
let lastOfflineAt = 0;
let failureTimestamps: number[] = [];
const listeners = new Set<Listener>();

const FAILURE_WINDOW_MS = 20000;
const FAILURE_THRESHOLD = 2;

function notify() {
  listeners.forEach((listener) => listener());
}

export function getOfflineSnapshot() {
  return {
    isOffline: navigatorOffline || requestIssues,
    lastOfflineAt,
  };
}

export function setNavigatorStatus(isOffline: boolean) {
  if (navigatorOffline === isOffline) return;
  navigatorOffline = isOffline;
  if (isOffline) {
    lastOfflineAt = Date.now();
  }
  notify();
}

export function markOffline() {
  if (!requestIssues) {
    requestIssues = true;
    lastOfflineAt = Date.now();
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
    notify();
  }
}

export function recordRequestSuccess() {
  failureTimestamps = [];
  if (requestIssues) {
    requestIssues = false;
    notify();
  }
}

export function subscribeOffline(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
