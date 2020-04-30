import { RequestWrapper } from "./requestWrapper";

export interface FlowGraph {
    recipes: string[];
    implicitRecipes : string[];
    nodes: any;
    datasets: string[];
    folders: string[];
    models: string[];
    streamingEndpoints: string[];
}

export async function getProjectFlowGraph(projectKey: string): Promise<FlowGraph> {
    const endpoint = "/projects/" + projectKey + "/flow/graph/";
    return await RequestWrapper.get(endpoint);
}
