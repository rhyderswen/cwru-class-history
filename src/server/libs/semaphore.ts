type QueueItem = { id: symbol; run: () => void };

export class Semaphore {
  private available: number;
  private readonly queue: QueueItem[] = [];

  constructor(maxConcurrency: number = 1) {
    this.available = maxConcurrency;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  acquire(
    onQueued?: (position: number) => void,
    onGrant?: () => void,
  ): {
    ready: Promise<void>;
    release: () => void;
    cancel: () => void;
  } {
    const id = Symbol();
    let released = false;
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    const grant = () => {
      this.available--;
      onGrant?.();
      resolveReady();
    };

    if (this.available > 0) {
      grant();
    } else {
      this.queue.push({ id, run: grant });
      onQueued?.(this.queue.length);
    }

    const release = () => {
      if (released) return;
      released = true;
      this.available++;
      const next = this.queue.shift();
      if (next) next.run();
    };

    const cancel = () => {
      if (released) return;
      const idx = this.queue.findIndex((item) => item.id === id);
      if (idx !== -1) {
        released = true;
        this.queue.splice(idx, 1);
      } else {
        release();
      }
    };

    return { ready, release, cancel };
  }
}
