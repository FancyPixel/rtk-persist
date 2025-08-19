import { createListenerMiddleware } from "@reduxjs/toolkit";

/**
 * The single, global instance of the RTK listener middleware.
 * This middleware is used to listen for specific actions and trigger
 * side effects, such as persisting the state to storage.
 *
 * {@link https://redux-toolkit.js.org/api/createListenerMiddleware}
 *
 * @internal
 */
export const listenerMiddleware = createListenerMiddleware();
