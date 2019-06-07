import { OutputChannel, window } from "vscode";
import { RequestWrapper } from "./requestWrapper";
import { Recipe } from "./recipe";
import { getOuputToBuild, RecipeOutput } from "./recipeOutput";

export enum ActivityState {
    NOT_STARTED="NOT_STARTED",
    WAITING="WAITING",
    RUNNING="RUNNING",
    DONE="DONE",
    FAILED="FAILED",
    ABORTED="ABORTED",
    SKIPPED="SKIPPED",
    COMPUTING_DEPS="COMPUTING_DEPS",
}

export interface Job {
    baseStatus: {
        def: {
            id: string
        } 
        state: ActivityState
        unexpectedFailure: {
            errorType: string;
            message: string;
            detailedMessage: string;
            detailedMessageHTML: string;
            stackTraceStr: string;
        }
    };
}

export interface CreationJobDef {
    outputs: Array<{
        id: string;
        type: string;
        partition?: string;
    }>;
    type: string;
}

export async function newCreationJobDef(output: RecipeOutput): Promise<CreationJobDef> {
    const partition = await promptPartitions(output);
    return {
        type: "NON_RECURSIVE_FORCED_BUILD",
        outputs: [
            {
                id: output.ref,
                type: output.type.toString(),
                partition,
            }
        ]
    };
}

export async function getJob(projectKey: string, id: string): Promise<Job> {
    const endpoint = "/projects/" + projectKey + "/jobs/" + id +"/";
    return RequestWrapper.get(endpoint);
}

export async function getJobLog(projectKey: string, jobId: string): Promise<string> {
    const endpoint = "/projects/" + projectKey + "/jobs/" + jobId +"/log";
    return RequestWrapper.get(endpoint, { json: false });
}

export async function abortJob(projectKey: string, jobId: string): Promise<string> {
    const endpoint = "/projects/" + projectKey + "/jobs/" + jobId +"/abort";
    return RequestWrapper.post(endpoint);
}

export async function waitJobToFinish(outputchannel: OutputChannel, projectKey: string, jobId: string): Promise<Job> {
    outputchannel.show();
    let job = await getJob(projectKey, jobId);
    do {
        getAndPrintJobLog(outputchannel, projectKey, jobId);
        await sleep(2000);
        job = await getJob(projectKey, jobId);
    } while (isJobRunning(job));

    getAndPrintJobLog(outputchannel, projectKey, jobId);
    return job;
}

export async function startRecipe(recipe: Recipe): Promise<{id: string}> {
    const output = await getOuputToBuild(recipe);
    if (!output) {
        throw new Error(`Recipe ${recipe.name} can not be run: it has no outputs`);
    }
    const body = await newCreationJobDef(output);
    const endpoint = "projects/"+ recipe.projectKey + "/jobs/";
    return RequestWrapper.post(endpoint, { body });
}

async function getAndPrintJobLog(outputchannel: OutputChannel, projectKey: string, jobId: string) {
    const log = await getJobLog(projectKey, jobId);
    outputchannel.clear();
    outputchannel.append(log);
}

function isJobRunning(job: Job): boolean {
    return [ActivityState.NOT_STARTED, 
            ActivityState.WAITING,
            ActivityState.RUNNING,
            ActivityState.COMPUTING_DEPS].includes(job.baseStatus.state);
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function promptPartitions(output: RecipeOutput): Promise<string | undefined> {
    if (output.partitionableElement.partitioning && output.partitionableElement.partitioning.dimensions.length > 0) {
        const partitioningDim = output.partitionableElement.partitioning.dimensions;
        const partitionsStr = partitioningDim.map(dim => dim.name).join("|");
        let newValue = await window.showInputBox({ placeHolder: partitionsStr, prompt: `This recipe requires partitions: ${partitionsStr}` });
        if (newValue) {
            return newValue;
        } else {
            throw new Error("No partition given: job not started");
        }
    }
}
