import { RequestWrapper } from "./requestWrapper";
import { Response } from "request";

export interface Project {
    name: string;
    projectKey: string;
}

export async function getProjectsWithVersion(): Promise<{ projects: Project[], version: string}> {
    const endpoint = "projects/";
    const response: Response = await RequestWrapper.get(endpoint,  { resolveWithFullResponse: true });
    if (! response.headers["dss-version"]) {
        throw new Error("Dataiku DSS: The URL of your DSS instance is not correct");
    }

    return {
        projects: response.body,
        version: response.headers["dss-version"] as string
    };
}