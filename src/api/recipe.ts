import { VersionTag } from "./versionTag";
import { RequestWrapper } from "./requestWrapper";
import { dssLanguageIdToFileType } from "../utils";

export interface Recipe {
    type: string;
    name: string;
    projectKey: string;
    outputs: {
        main: {
            items: Array<
                {
                    ref: string
                }>
        }
    };
    versionTag: VersionTag;
    successors: string[];
    predecessors: string[];
}

export interface RecipeAndPayload {
    recipe: Recipe;
    payload: string;
}

export async function getCodeRecipes(projectKey: string): Promise<Recipe[]> {
    const endpoint = "/projects/" + projectKey + "/recipes/";
    const recipes: Recipe[] = await RequestWrapper.get(endpoint);
    return recipes.filter((recipe) => Object.keys(dssLanguageIdToFileType).includes(recipe.type));
}

export async function getRecipeAndPayload(recipe: Recipe): Promise<RecipeAndPayload> {
    const endpoint = "/projects/" + recipe.projectKey + "/recipes/"+recipe.name;
    const recipeAndPayload = await RequestWrapper.get<RecipeAndPayload>(endpoint);
    if (recipeAndPayload.payload === undefined) {
        recipeAndPayload.payload = "";
    }
    return recipeAndPayload;
}

export function saveRecipe(recipeAndPayload: RecipeAndPayload): Promise<void> {
    const projectKey = recipeAndPayload.recipe.projectKey;
    const endpoint = "/projects/" + projectKey + "/recipes/" + recipeAndPayload.recipe.name;
    return RequestWrapper.put(endpoint, { body: recipeAndPayload });
}

