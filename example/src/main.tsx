import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import './index.css'
import { store } from './state/store.ts'

// Get the root element from the DOM.
const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

// Render the application.
root.render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
