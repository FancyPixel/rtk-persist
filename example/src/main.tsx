import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistedProvider } from 'rtk-persist'
import App from './App.tsx'
import './index.css'
import { store } from './state/store.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistedProvider store={store} loader={<div>Loading state...</div>}>
      <App />
    </PersistedProvider>
  </React.StrictMode>,
)
