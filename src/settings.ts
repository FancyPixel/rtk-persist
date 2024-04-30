import { StorageHandler } from "./types";

let defaultStorageHandler: StorageHandler;
export default class Settings {
  static get storageHandler(): StorageHandler {
    if (!defaultStorageHandler) {
      throw new Error('The default storage handler must be set.');
    }
    return defaultStorageHandler;
  }

  static set storageHandler(storageHandler: StorageHandler) {
    defaultStorageHandler = storageHandler;
  }
}