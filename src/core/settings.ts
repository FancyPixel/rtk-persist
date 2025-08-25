import { StorageHandler } from './types';

/**
 * A private variable to hold the global storage handler.
 * @private
 */
let _storageHandler: StorageHandler | undefined;

/**
 * A private variable to hold the global application ID.
 * @private
 */
let _applicationId: string | undefined;

/**
 * A private array to store the IDs of all subscribed slices.
 * @private
 */
let _subscribedSliceIds: string[] = [];

/**
 * A static class that manages global settings for the `rtk-persist` library.
 * It provides a centralized way to configure the storage handler, application
 * ID, and to track which slices are subscribed for persistence.
 *
 * This class is not meant to be instantiated.
 * @internal
 */
export default class Settings {
  constructor() {
    throw new Error('The Settings class is a static utility and should not be instantiated.');
  }

  /**
   * Gets the currently configured storage handler.
   *
   * @returns The active storage handler.
   * @throws {TypeError} If the storage handler has not been set.
   */
  static get storageHandler(): StorageHandler {
    if (!_storageHandler) {
      throw new TypeError('A storage handler must be configured before use.');
    }
    return _storageHandler;
  }

  /**
   * Sets the storage handler to be used for all persistence operations.
   *
   * @param storageHandler - The storage handler to use (e.g., `localStorage`).
   */
  static set storageHandler(storageHandler: StorageHandler) {
    _storageHandler = storageHandler;
  }

  /**
   * Gets the unique application ID used for namespacing storage keys.
   *
   * @returns The configured application ID.
   * @throws {TypeError} If the application ID has not been set.
   */
  static get applicationId(): string {
    if (!_applicationId) {
      throw new TypeError('An application ID must be configured before use.');
    }
    return _applicationId;
  }

  /**
   * Sets the unique application ID. This is used to namespace keys in storage,
   * preventing conflicts between different applications on the same domain.
   *
   * @param applicationId - The unique identifier for the application.
   */
  static set applicationId(applicationId: string) {
    _applicationId = applicationId;
  }

  /**
   * Returns a copy of the list of all subscribed slice identifiers.
   * @returns A new array containing the IDs of all slices subscribed to persistence.
   */
  static get subscribedSliceIds(): string[] {
    return [..._subscribedSliceIds];
  }

  /**
   * Subscribes a slice to the persistence service by adding its ID to the
   * internal list. This ensures that the library knows which parts of the
   * state to manage. Duplicates are ignored.
   * @param sliceId - The unique identifier of the Redux slice to subscribe.
   */
  static subscribeSlice(sliceId: string) {
    if (!_subscribedSliceIds.includes(sliceId)) {
      _subscribedSliceIds.push(sliceId);
    }
  }
}

/**
 * A utility class for testing purposes that extends the base `Settings`.
 * It provides a method to reset all global settings to their default,
 * uninitialized state, ensuring a clean slate between tests.
 * @internal
 */
export class TestSettings extends Settings {
  /**
   * Restores all global settings to their initial default values.
   */
  static restoreDefaults() {
    _storageHandler = undefined;
    _applicationId = undefined;
    _subscribedSliceIds = [];
  }
}
