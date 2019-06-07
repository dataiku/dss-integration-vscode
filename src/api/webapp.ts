import { VersionTag } from "./versionTag";
import { RequestWrapper } from "./requestWrapper";

export interface WebAppDetails {
    type: WebAppType;
    projectKey: string;
    name: string;
    id: string;
}

export enum WebAppType {
    SHINY="SHINY",
    BOKEH="BOKEH",
    STANDARD="STANDARD",
}

export interface WebApp extends WebAppDetails {
    params: BokehWebAppParams | ShinyWebAppParams | StandardWebAppParams;
    versionTag: VersionTag;
}

export interface BokehWebAppParams {
    python: string;
}

export interface ShinyWebAppParams {
    ui: string;
    server: string;
}

export interface StandardWebAppParams {
    html: string;
    css: string;
    js: string;
    python: string;
    backendEnabled: boolean;
}

export enum WebAppFile {
    BACKEND="backend.py",
    SERVER="server.r",
    UI="ui.r",
    HTML="template.html",
    CSS="style.css",
    JS="javascript.js"
}

export function getModifiedWebApp(webApp: WebApp, modifiedFileName: string, newContent: string) {
    switch(modifiedFileName) {
        case WebAppFile.BACKEND:
            (webApp.params as BokehWebAppParams | StandardWebAppParams).python = newContent;
            break;
        case WebAppFile.UI:
            (webApp.params as ShinyWebAppParams).ui = newContent;
            break;
        case WebAppFile.SERVER:
            (webApp.params as ShinyWebAppParams).server = newContent;
            break;
        case WebAppFile.HTML:
            (webApp.params as StandardWebAppParams).html = newContent;
            break;
        case WebAppFile.CSS:
            (webApp.params as StandardWebAppParams).css = newContent;
            break;
        case WebAppFile.JS:
            (webApp.params as StandardWebAppParams).js = newContent;
            break;
    }
    return webApp;
}

export function getWebApps(projectKey: string): Promise<WebAppDetails[]> {
    const endpoint = "/projects/" + projectKey + "/webapps/";
    return RequestWrapper.get(endpoint);
}

export function getWebApp(webApp: WebAppDetails): Promise<WebApp> {
    const endpoint = "/projects/" + webApp.projectKey + "/webapps/" + webApp.id + "/";
    return RequestWrapper.get(endpoint);
}

export function saveWebApp(webApp: WebApp): Promise<void> {
    const endpoint = "/projects/" + webApp.projectKey + "/webapps/" + webApp.id + "/";
    return RequestWrapper.put(endpoint, { body: webApp });
}