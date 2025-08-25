# RTK-Persist Example Application

This application serves as a working demonstration of the `rtk-persist` library. It showcases how to integrate the library into a standard Redux Toolkit project to enable persistent state for both root-level and nested slices.

Use this project to understand the library's features or as a sandbox for testing changes during development.

***

## ✨ Features Demonstrated

This example application showcases:

* **Basic Persistence**: The `counters` slice is persisted at the root of the Redux state.
* **Store Configuration**: How to use `configurePersistedStore` to set up the store with a storage handler.

***

## 🚀 Getting Started

1.  **Navigate to the example app directory**:
    ```bash
    cd rtk-persist/example
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
    Edit the source code in the `rtk-persist/src` directory.

2.  **Rebuild the Library**:
    From the root `rtk-persist` directory, run the build command:
    ```bash
    # From the root of the project
    yarn build
    ```

3.  **See Changes in the Example App**:
    The Vite development server in the `example` directory will automatically pick up the changes. Simply refresh your browser to see the effects of your latest build.
