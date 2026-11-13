export interface CarouselState {
  readonly index: number;
  readonly rotation: number;
}

export type PauseReason = 'initializing' | 'focus' | 'dialog' | 'pointer' | 'touch' | 'motion' | 'visibility';
export type Unsubscribe = () => void;
export interface CarouselOptions {
  count: number;
  delay?: number;
  /** Schedule one tick and return its cancellation function. */
  schedule?: (callback: () => void, delay: number) => Unsubscribe;
}
const scheduleTimeout: NonNullable<CarouselOptions['schedule']> = (callback, delay) => {
  const id = setTimeout(callback, delay);
  return () => clearTimeout(id);
};

// Framework-independent state: reusable by Vue, React or a vanilla JS interface.
export function createCarousel({ count, delay = 3000, schedule = scheduleTimeout }: CarouselOptions) {
  if (!Number.isInteger(count) || count < 1) throw new Error('Carousel requires at least one project');
  if (!Number.isFinite(delay) || delay <= 0) throw new Error('Carousel delay must be positive');
  let index = 0, rotation = 0, disposed = false;
  let cancelTick: Unsubscribe | undefined;
  const pauses = new Set<PauseReason>(['initializing']);
  const listeners = new Set<(state: CarouselState) => void>();
  const snapshot = (): CarouselState => ({ index, rotation });
  function sync() {
    cancelTick?.();
    cancelTick = undefined;
    if (!disposed && count > 1 && pauses.size === 0) cancelTick = schedule(() => select(index + 1), delay);
  }
  function select(next: number) {
    if (disposed) return;
    if (!Number.isInteger(next)) throw new Error('Project index must be an integer');
    const target = ((next % count) + count) % count;
    let step = target - index;
    if (step > count / 2) step -= count;
    if (step < -count / 2) step += count;
    rotation -= step * 360 / count;
    index = target;
    listeners.forEach(listener => listener(snapshot()));
    sync();
  }
  return {
    snapshot, select,
    subscribe(listener: (state: CarouselState) => void): Unsubscribe { listeners.add(listener); return () => { listeners.delete(listener); }; },
    pause(reason: PauseReason) { pauses.add(reason); sync(); },
    resume(reason: PauseReason) { pauses.delete(reason); sync(); },
    dispose() { disposed = true; sync(); listeners.clear(); },
  };
}
