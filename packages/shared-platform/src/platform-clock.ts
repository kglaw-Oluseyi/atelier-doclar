export interface PlatformClock {
  now(): Date;
}

export const systemClock: PlatformClock = {
  now: () => new Date(),
};
