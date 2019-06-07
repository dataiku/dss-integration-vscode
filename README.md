# Dataiku DSS Visual Studio Code Extension

Easily edit code Recipes, Web App files, Plugin files of your DSS projects right into VSCode.

## Features

The extension offers a new menu in the left panel (with the Dataiku logo). Through it, you can browse your projects and plugins.<br>
Depending on the version of your DSS instance, some features might not be available.

### DSS > 5.0.0

#### Code Recipe

You can browse all code recipe of a project, edit them and when you save them, they will be saved back into DSS.

When a code recipe is open you will find in the bottom bar a button to run this recipe remotely on DSS. A new *Output* window will open and print the log of the running recipe.

#### Plugins

You can browse into your plugins' hierarchy, edit the files and when you save them, they will be saved back into DSS.
When you select a folder, a new icon will appear to let you add new files in this folder.

Note: When working with a DSS 5.1.3 or lower instance, saving a plugin file saving a plugin file will overide the one on the DSS instance even if it's more recent.

### DSS >= 5.1.0

#### Code Recipe

Python and R recipe can be **run locally**. To do so you will need:
- to have the *dataiku* package installed on your machine: to install it, follow the instructions [here for Python](https://doc.dataiku.com/dss/latest/python-api/outside-usage.html#using-the-dataiku-package), and [here for R](https://doc.dataiku.com/dss/latest/R-api/outside-usage.html#installing-the-dataiku-package)
- to have a Python or R extension to run easily the file (make sure it uses the right interpretor, with the dataiku package). For instance the [Microsoft Python Extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) allows you to select a Python interpretor, and run the open file (open command Palette and search for *Python: Run Python File in Terminal*)

### DSS >= 5.1.4

#### Web Apps

Web apps can be listed, browsed and their files edited and saved into DSS.

#### Plugins
Starting with DSS 5.1.4, saving a plugin file will not replace the remote one if it's more recent, but will print a window to prevent conflicts.

Plugins folders and files can be deleted directly from the hierarchy. Folders such as files can also be added.  

## Requirements

- Access to DSS instance running version 5.0 or above
- a valid Personal API key

## Extension Settings

There are two mandatory settings:
- the DSS instance base url (http(s)://DSS_HOST:DSS_PORT)
- the Personal API key

They are two ways to set them:

- Through environment variables:
    Before starting VSCode export the following environment variables:
    - DKU_DSS_URL=http(s)://DSS_HOST:DSS_PORT/
    - DKU_API_KEY="Your API key secret"

- Through the configuration file ~/.dataiku/config.json.
    - You can either create it manually with the following content :
        ```json
        {
            "dss_instances": {
                "default": {
                    "url": "http(s)://DSS_HOST:DSS_PORT/",
                    "api_key": "Your API key secret"
                }
            },
            "default_instance": "default"
        }
        ```
        Note that, if you have set multiple instances the extension will always use the one set as `default_instance`.
    - Or you can use the extension commands to create and edit the file for you. Search for **DSS API** or **DSS URL** in the command Palette to launch one of the   commands.

If you want to execute Python or R recipes locally and your DSS instance has SSL enabled, the dataiku package will verify the certificate. In order for this to work, you may need to add the root authority that signed the DSS SSL certificate to your local trust store. Please refer to your OS or Python manual for instructions.

If this is not possible, you can also disable checking the SSL certificate:
- By editing the configuration file:
    ```json
    {
        "dss_instances": {
            "default": {
                "url": "http(s)://DSS_HOST:DSS_PORT/",
                "api_key": "Your API key secret",
                "no_check_certificate": true
            }
        },
        "default_instance": "default"
    }
    ```
- Or by running one of the commands, search for **DSS certificate** in the command Palette


