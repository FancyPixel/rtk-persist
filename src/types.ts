/**
 * This is the description of the storage handler used to persist the data
 *
 * @interface StorageHandler
 * @member {function} setItem is used to save the stringified version of the data inot the database
 * @member {function} getItem is used to retrive the stringified version of the data from the database
 * @member {function} removeItem is used to remove the data from the database
 *
 * Available storage could be {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | localStorage}, {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage | sessionStorage} or {@link https://github.com/react-native-async-storage/async-storage | AsyncStorage}
 *
 */
export interface StorageHandler {
  setItem: (key: string, value: string) => Promise<void> | void;
  getItem: (key: string) => Promise<string | null> | (string | null);
  removeItem: (key: string) => Promise<void> | void;
}

export const DEFAULT_INIT_ACTION_TYPE = '@@INIT-PERSIST';
