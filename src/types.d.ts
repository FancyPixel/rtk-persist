export interface StorageHandler {
  setItem: (key: string, value: string) => Promise<void> | void;
  getItem: (key: string) => Promise<string | null> | (string | null);
  removeItem: (key: string) => Promise<void> | void;
}