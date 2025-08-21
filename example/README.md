# RTK-Persist Example Application

This application serves as a working demonstration of the `rtk-persist` library. It showcases how to integrate the library into a standard Redux Toolkit project to enable persistent state.

Use this project to understand the library's features or as a sandbox for testing changes during development.

***

## 🚀 Getting Started

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone [https://github.com/FancyPixel/rtk-persist.git](https://github.com/FancyPixel/rtk-persist.git)
    ```

2.  **Navigate to the example app directory**:
    ```bash
    cd rtk-persist/example
    ```

3.  **Install dependencies**:
    This command will also link the local `rtk-persist` library from the parent directory, as specified in `package.json`.
    ```bash
    yarn
    ```

4.  **Run the application**:
    ```bash
    yarn dev
    ```

***

## 🛠️ Developing and Testing Local Library Changes

If you have made changes to the `rtk-persist` library source code, the example app can use them directly thanks to the local file path dependency. This workflow ensures that the example app always uses your latest local code from the library.

1.  **Navigate to the Library's Root Directory**:
    Open a terminal and go to the root of the `rtk-persist` library (the parent directory of `example`).
    ```bash
    # Assuming you are in the 'example' directory
    cd ..
    ```

2.  **Build the Library**:
    After making any changes to the library's source code, you must rebuild it for the changes to be reflected in the example app.
    ```bash
    yarn build
    ```

3.  **Run the Example App**:
    Navigate back to the example app directory and start the development server. The app will automatically use the newly built version of the library.
    ```bash
    cd example
    yarn dev
    ```

Now, the example app is running with your modified version of the `rtk-persist` library. Simply repeat step 2 every time you want to test new changes.
