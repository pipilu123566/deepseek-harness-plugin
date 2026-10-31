import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export class ControlError extends Error {
  constructor(code, status = 409) { super(code); this.code = code; this.status = status; }
}
const digest = token => createHash('sha256').update(token).digest();

// A process-local, single-connection lease. No desktop data or credentials are
// persisted, and closing a connection has no effect on any other Host work.
export class DesktopController {
  constructor({ reservationTimeoutMs = 15000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    if (!Number.isSafeInteger(reservationTimeoutMs) || reservationTimeoutMs <= 0) throw new TypeError('Invalid connection reservation timeout');
    this.reservationTimeoutMs = reservationTimeoutMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.leaseHash = null;
    this.socket = null;
    this.timer = null;
    this.disposed = false;
  }
  get phase() { return this.socket ? 'connected' : this.leaseHash ? 'connecting' : 'idle'; }
  owned(token) {
    return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token) && this.leaseHash !== null
      && timingSafeEqual(digest(token), this.leaseHash);
  }
  snapshot(token) { return { phase: this.phase, owned: this.owned(token), connected: this.socket !== null }; }
  connect(token) {
    if (this.disposed) throw new ControlError('unavailable', 503);
    if (this.leaseHash !== null) {
      if (this.owned(token)) return token;
      throw new ControlError('desktop-in-use');
    }
    const lease = randomBytes(32).toString('base64url');
    const hash = this.leaseHash = digest(lease);
    this.timer = this.setTimer(() => {
      if (this.leaseHash === hash && this.socket === null) this.release();
    }, this.reservationTimeoutMs);
    this.timer.unref?.();
    return lease;
  }
  canConnect(token) { return !this.disposed && this.phase === 'connecting' && this.owned(token); }
  hasSocket(socket) { return !this.disposed && this.socket === socket; }
  attachSocket(token, socket) {
    if (!this.canConnect(token)) throw new ControlError('connection-required');
    this.socket = socket;
    this.cancelTimer();
    socket.once('close', () => {
      if (this.socket === socket) this.release();
    });
  }
  disconnect(token) {
    if (this.phase === 'idle') return;
    if (!this.owned(token)) throw new ControlError('connection-owner-required', 403);
    this.release();
  }
  cancelTimer() {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }
  release() {
    const socket = this.socket;
    this.socket = null;
    this.leaseHash = null;
    this.cancelTimer();
    socket?.terminate();
  }
  dispose() { this.disposed = true; this.release(); }
}
