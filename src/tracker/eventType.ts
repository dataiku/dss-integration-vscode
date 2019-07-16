export enum EventType {
    START_EXTENSION="start",

    REFRESH_PROJECT_LIST="refresh-project-list",
    REFRESH_PLUGIN_LIST="refresh-plugin-list",

    OPEN_WEBAPP="open-webapp",
    OPEN_RECIPE="open-recipe",
    OPEN_PLUGIN_FILE="open-plugin-file",

    SAVE_RECIPE="save-recipe",
    SAVE_WEBAPP_FILE="save-webapp-file",
    SAVE_PLUGIN_FILE="save-plugin-file",

    ADD_PLUGIN_FILE="add-plugin-file",
    ADD_PLUGIN_FOLDER="add-plugin-folder",

    DELETE_PLUGIN_FILE="delete-plugin-file",
    DELETE_PLUGIN_FOLDER="delete-plugin-file",

    RUN_RECIPE="run-recipe",
    ABORT_RECIPE="abort-recipe",
}
