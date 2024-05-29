import { StorageHandler } from "./types";

/**
  * Global storage handler variable
  * @private
  */
let _storageHandler: StorageHandler | undefined;

/**
 * Global Setting class that encapsulates all the library settings.
 * @public
 */
export default class Settings {
  constructor() {
    _storageHandler = undefined;
  }

  /**
   * Returns the selected storage handler if set.
   *
   * @returns The selected storage handler
   *
   * @throws {@link TypeError}
   * This exception is thrown if the storage handler has not been set.
   *
   * @public
   */
  static get storageHandler(): StorageHandler {
    if (!_storageHandler) {
      throw new TypeError('The default storage handler must be set.');
    }
    return _storageHandler;
  }

  /**
   * Sets the storage handler to be used when persist the data.
   *
   * @param storageHandler - The selected storage handler.
   *
   * @public
   */
  static set storageHandler(storageHandler: StorageHandler) {
    _storageHandler = storageHandler;
  }
}

export class TestSettings extends Settings {


  /**
   * Restores the default settings.
   * @internal
   */
  static _clearSettings() {
    _storageHandler = undefined;
  }
}
