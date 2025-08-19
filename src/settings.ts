import { StorageHandler } from "./types";

/**
 * Global storage handler variable
 * @private
 */
let _storageHandler: StorageHandler | undefined;

/**
 * Global storage unique id variable
 * @private
 */
let _applicationId: string | undefined;

/**
 * Global array of subscribed slice identifiers
 * @private
 */
let _subscribedSliceIds: string[] = [];

/**
 * Global flag to enable or disable persistence. Defaults to true.
 * @private
 */
let _isPersistenceEnabled: boolean = true;

/**
 * Global Setting class that encapsulates all the library settings.
 * @internal
 */
export default class Settings {
  constructor() {
    throw new Error('This class is not meant to be instantiated.');
  }

  /**
   * Returns the selected storage handler if set.
   *
   * @returns The selected storage handler
   *
   * @throws {@link TypeError}
   * This exception is thrown if the storage handler has not been set.
   *
   * @internal
   */
  static get storageHandler(): StorageHandler {
    if (!_storageHandler) {
      throw new TypeError('The default storage handler must be set.');
    }
    return _storageHandler;
  }

  /**
   * Sets the storage handler to be used when persisting the data.
   *
   * @param storageHandler - The selected storage handler.
   *
   * @internal
   */
  static set storageHandler(storageHandler: StorageHandler) {
    _storageHandler = storageHandler;
  }

  /**
   * Returns the storage unique id.
   *
   * @returns The storage unique id
   *
   * @throws {@link TypeError}
   * This exception is thrown if the id has not been set.
   *
   * @internal
   */
  static get applicationId(): string {
    if (!_applicationId) {
      throw new TypeError('The storage ID must be set.');
    }
    return _applicationId;
  }

  /**
   * Sets the storage id to be used when persisting the data.
   *
   * @param applicationId - The selected storage id.
   *
   * @internal
   */
  static set applicationId(applicationId: string) {
    _applicationId = applicationId;
  }

  /**
   * Returns a copy of all subscribed slice identifiers.
   * @returns {Array<string>} A new array of slice IDs.
   * @internal
   */
  static get subscribedSliceIds(): string[] {
    return [..._subscribedSliceIds];
  }

  /**
   * Subscribes a Redux slice by adding its identifier to the list.
   * This method prevents duplicate entries.
   * @param {string} sliceId - The unique identifier of the Redux slice.
   * @internal
   */
  static subscribeSlice(sliceId: string) {
    if (!_subscribedSliceIds.includes(sliceId)) {
      _subscribedSliceIds.push(sliceId);
    }
  }

  /**
   * Checks if persistence is currently enabled.
   * @returns {boolean} True if persistence is enabled, otherwise false.
   * @internal
   */
  static get isPersistenceEnabled(): boolean {
    return _isPersistenceEnabled;
  }

  /**
   * Pauses the persistence of the store.
   * While paused, no state changes will be saved to storage.
   * @internal
   */
  static pause() {
    _isPersistenceEnabled = false;
  }

  /**
   * Resumes the persistence of the store.
   * @internal
   */
  static resume() {
    _isPersistenceEnabled = true;
  }
}

export class TestSettings extends Settings {
  /**
   * Restores all settings to their default state.
   * @internal
   */
  static _clearSettings() {
    _storageHandler = undefined;
    _applicationId = undefined;
    _subscribedSliceIds = [];
    _isPersistenceEnabled = true;
  }
}
