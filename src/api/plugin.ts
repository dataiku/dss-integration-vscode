import { RequestWrapper } from './requestWrapper';
import { Response } from 'request';

export interface Plugin {
    id: string;
    meta: {
        label: string,
        description: string,
        icon: string
    };
    isDev: boolean;
}

export interface PluginItem {
    name: string;
    path: string;
    lastModified: number;
    children?: PluginItem[];
}

export async function getPluginsWithVersion(): Promise<{ plugins: Plugin[], version: string }> {
    const endpoint = '/plugins/';
    const response: Response = await RequestWrapper.get(endpoint, { resolveWithFullResponse: true });
    if (! response.headers["dss-version"]) {
        throw new Error("Dataiku DSS: The URL of your DSS instance is not correct");
    }

    return {
        plugins: response.body.filter((plugin: Plugin) => plugin.isDev),
        version: response.headers["dss-version"] as string
    };
}

export function getPluginItemDetails(pluginKey: string, path: string): Promise<PluginItem> {
    const endpoint = `/plugins/${pluginKey}/details/${path}`;
    return RequestWrapper.get(endpoint);
}

export function getPluginContents(pluginKey: string): Promise<PluginItem[]> {
    const endpoint = `/plugins/${pluginKey}/contents`;
    return RequestWrapper.get(endpoint);
}

export function removePluginContents(pluginKey: string, path: string) : Promise<void> {
    const endpoint = `/plugins/${pluginKey}/contents/${path}`;
    return RequestWrapper.delete(endpoint);
}

export async function getPluginFileContentAndType(pluginKey: string, path: string): Promise<{ content: string, type?: string }> {
    const endpoint = `/plugins/${pluginKey}/contents/${path}`;
    const response: Response = await RequestWrapper.get(endpoint,  { resolveWithFullResponse: true,  encoding: null });
    const type = response.headers["content-type"];
    let content: string;

    if (type && type.startsWith("image")) {
        content = response.body.toString("base64");
    } else if (response.body instanceof Buffer) {
        content = response.body.toString();
    } else  if (response.body === undefined) {
        content = "";
    } else {
        content = JSON.stringify(response.body, null, 4);
    }
   
    return { content, type };
}

export function savePluginFile(pluginKey: string, path: string, content?: string): Promise<string> {
    const endpoint = `/plugins/${pluginKey}/contents/${path}`;
    return RequestWrapper.post(endpoint, { body: content, json: false });
}

export function addPluginFolder(pluginId: string, path: string) {
    const endpoint = `/plugins/${pluginId}/folders/${path}`;
    return RequestWrapper.post(endpoint);
}

export function renamePluginContent(pluginId: string, path: string, newName: string) {
    const endpoint = `/plugins/${pluginId}/contents-actions/rename`;
    const content = { "oldPath": path, "newName": newName};
    return RequestWrapper.post(endpoint, { body: content});
}

export function movePluginContent(pluginId: string, path: string, newPath: string) {
    const endpoint = `/plugins/${pluginId}/contents-actions/move`;
    const content = { "oldPath": path, "newPath": newPath};
    return RequestWrapper.post(endpoint, { body: content});
}