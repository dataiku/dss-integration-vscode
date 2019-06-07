import { RequestWrapper, HttpError } from "./requestWrapper";
import { Recipe } from "./recipe";

export interface PartitionableElement {
    partitioning?: {
        dimensions: Array<
            {
                name: string;
            }>
    };
}

export enum PartitionableType {
    MANAGED_FOLDER="MANAGED_FOLDER",
    DATASET="DATASET"
}

export interface RecipeOutput {
    ref: string;
    partitionableElement: PartitionableElement;
    type: PartitionableType;
}

export async function getOuputToBuild(recipe: Recipe): Promise<RecipeOutput | undefined> {
    let outputToBuild: RecipeOutput | undefined;

    if (recipe.outputs.main) {
        for (const output of recipe.outputs.main.items) {
            outputToBuild = await getRecipeOutput(recipe.projectKey, output.ref);
            if (outputToBuild.partitionableElement.partitioning && 
                    outputToBuild.partitionableElement.partitioning.dimensions.length > 0) {
                // Stop at the first output which is partitioned
                // because all the partitioned outputs have the same dimensions
                break;
            }
        }
    }
    return outputToBuild;
}

async function getRecipeOutput(projectKey: string, ref: string): Promise<RecipeOutput> {
    try {
        const endpoint = `/projects/${projectKey}/datasets/${ref}`;
        const partitionableElement = await RequestWrapper.get<PartitionableElement>(endpoint);
        return { partitionableElement, type: PartitionableType.DATASET, ref };
    } catch (e) {
        if (e instanceof HttpError && e.errorCode === 404) {
            // If the output dataset is not found, we asume the output is folder
            const endpoint = `/projects/${projectKey}/managedfolders/${ref}`;
            const partitionableElement = await RequestWrapper.get<PartitionableElement>(endpoint);
            return { partitionableElement, type: PartitionableType.MANAGED_FOLDER, ref };
        } else {
            throw e;
        }
    }
}