// localStorage can throw (private mode, blocked cookies), so every access is
// wrapped. If storage is unavailable the app still works; it just forgets.
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// Where this phone remembers its active order for a shop, so scanning the
// counter QR again reopens the same order instead of taking a new one.
export const activeOrderKey = (shopSlug: string) => `pager:order:${shopSlug}`;
