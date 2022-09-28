import { RequestWrapper } from "./requestWrapper";

export interface ProjectLibraryItem {
    name: string;
    path: string;
    mimeType: string;
    data: string;
    hasData: boolean;
    lastModified: number;
    children?: ProjectLibraryItem[];
}

export function getLibraryContents(projectKey: string): Promise<ProjectLibraryItem[]> {
    const endpoint = `/projects/${projectKey}/libraries/contents`;
    return RequestWrapper.get(endpoint);
}

export function removeLibraryContents(projectKey: string, path: string) : Promise<void> {
    const endpoint = `/projects/${projectKey}/libraries/contents/${path}`;
    return RequestWrapper.delete(endpoint);
}

export async function getLibraryFileContent(projectKey: string, path: string): Promise<ProjectLibraryItem> {
    const endpoint = `/projects/${projectKey}/libraries/contents/${path}`;
    return RequestWrapper.get(endpoint);
}

export function saveLibraryFile(projectKey: string, path: string, content?: string): Promise<string> {
    const endpoint = `/projects/${projectKey}/libraries/contents/${path}`;
    return RequestWrapper.post(endpoint, { body: content, json: false });
}

export function addLibraryFolder(projectKey: string, path: string) : Promise<void>{
    const endpoint = `/projects/${projectKey}/libraries/folders/${path}`;
    return RequestWrapper.post(endpoint);
}

export function renameLibraryContent(projectKey: string, path: string, newName: string) : Promise<void>{
    const endpoint = `/projects/${projectKey}/libraries/contents-actions/rename`;
    const content = { "oldPath": path, "newName": newName };
    return RequestWrapper.post(endpoint, { body: content });
}

export function moveLibraryContent(projectKey: string, path: string, newPath: string) : Promise<void>{
    const endpoint = `/projects/${projectKey}/libraries/contents-actions/move`;
    const content = { "oldPath": path, "newPath": newPath };
    return RequestWrapper.post(endpoint, { body: content });
}