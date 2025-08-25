import { createListenerMiddleware } from '@reduxjs/toolkit';

/**
 * The core listener middleware for `rtk-persist`.
 *
 * This singleton instance is central to the persistence mechanism. It's used
 * to listen for actions that modify the state of persisted slices and triggers
 * the side effect of writing those changes to storage.
 *
 * {@link https://redux-toolkit.js.org/api/createListenerMiddleware}
 *
 * @internal
 */
export const listenerMiddleware = createListenerMiddleware();
