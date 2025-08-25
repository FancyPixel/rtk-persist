# RTK-Persist Example Application

This application serves as a working demonstration of the `rtk-persist` library. It showcases how to integrate the library into a standard Vite + React application to enable persistent state.

Use this project to understand the library's features or as a sandbox for testing changes during development.

***

## ✨ Features Demonstrated

This example application showcases:

* **Asynchronous Store Creation**: How to use `createPersistedStore` to set up the store, which returns a promise that resolves after the state is rehydrated.
* **React Redux Integration**: The use of the `<PersistedProvider />` component to delay rendering until the store is ready, preventing UI flicker.
* **Basic Persistence**: The `counter` slice is persisted to `localStorage`.

***

## 🚀 Getting Started

1.  **Navigate to the example app directory**:
    ```bash
    cd example
    ```

2.  **Install dependencies**:
    This command will also link the local `rtk-persist` library from the parent directory.
    ```bash
    yarn
    ```

3.  **Run the application**:
    ```bash
    yarn dev
    ```

***

## 🛠️ Developing and Testing Local Library Changes

The example app is configured to use your local version of the `rtk-persist` library, allowing you to test changes in real-time.

1.  **Make Changes in the Library**:
    Edit the source code in the `src` directory at the root of the project.

2.  **Rebuild the Library**:
    From the root `rtk-persist` directory, run the build command:
    ```bash
    # From the root of the project
    yarn build
    ```

3.  **See Changes in the Example App**:
    The Vite development server in the `example` directory will automatically pick up the changes. Simply refresh your browser to see the effects of your latest build.
            