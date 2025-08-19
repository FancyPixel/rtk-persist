import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import './index.css'
import { store as storePromise } from './state/store.ts'

// Get the root element from the DOM.
const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

// Create an async function to initialize and render the app.
const startApp = async () => {
  // Await the store promise to ensure the store is created and rehydrated.
  const store = await storePromise;

  // Once the store is ready, render the application.
  root.render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>
  );
};

// Call the async function to start the application.
startApp();
