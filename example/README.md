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
    ```bash
    yarn
    ```

4.  **Run the application**:
    ```bash
    yarn start
    ```

***

## 🛠️ Developing and Testing Local Library Changes

If you have made changes to the `rtk-persist` library source code and want to test them in this example app without publishing to npm, follow these steps.

This workflow ensures that the example app uses your latest local code from the library.

1.  **Navigate to the Library's Root Directory**:
    Open a terminal and go to the root of the `rtk-persist` library, not the example app.
    ```bash
    # Assuming you are in the 'example' directory
    cd ..
    ```

2.  **Build the Library**:
    Compile the library's TypeScript source code into JavaScript.
    ```bash
    yarn build
    ```

3.  **Package the Library**:
    Create a local tarball (`.tgz` file) of the library. This is what you will install in the example app.
    ```bash
    yarn pack
    ```
    This command will create a file like `rtk-persist-v1.0.1.tgz` in the library's root directory. Note the exact filename.

4.  **Navigate Back to the Example App Directory**:
    ```bash
    cd example
    ```

5.  **Install the Local Library Package**:
    Install the `.tgz` file you created in step 3. This will override the version from the npm registry.
    ```bash
    # Replace the filename with the one generated in step 3
    yarn add file:../rtk-persist-v1.0.1.tgz
    ```

6.  **Run the Example App**:
    Start the example application to see your local changes in action.
    ```bash
    yarn start
    ```

Now, the example app is running with your modified version of the `rtk-persist` library. Repeat this process every time you want to test new changes.
