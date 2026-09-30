/** Slot keys are dotted lowercase segments (marketplace.home.top); nothing else reaches a path. */
const SLOT_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function isSlotKey(value: string): boolean {
  return SLOT_KEY.test(value);
}
