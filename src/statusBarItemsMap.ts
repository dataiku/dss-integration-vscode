import * as vscode from "vscode";
import { Recipe } from "./api/recipe";

class RecipeStatusBar {
    runBarItem: vscode.StatusBarItem;
    partitionBarItem: vscode.StatusBarItem;

    constructor(runBarItem: vscode.StatusBarItem, partitionBarItem: vscode.StatusBarItem) {
        this.runBarItem = runBarItem;
        this.partitionBarItem = partitionBarItem;
    }

    hideBarItems() {
        this.runBarItem.hide();
        this.partitionBarItem.hide();
    }

    showBarItems() {
        this.runBarItem.show();
        this.partitionBarItem.show();
    }

    disposeBarItems() {
        this.runBarItem.dispose();
        this.partitionBarItem.show();
    }

    setAsRunnable(recipeName: string) {
        this.partitionBarItem.hide();
        this.runBarItem.text = "$(play) Run " + recipeName;
        this.runBarItem.command = "dssProjects.runRecipe";
        this.runBarItem.tooltip = "Run this recipe in DSS";
        this.showBarItems();
    }

    setPartitionToBuild(partitions: string) {
        this.hideBarItems();
        this.partitionBarItem.text = partitions;
        this.partitionBarItem.command = "dssProjects.selectPartitions";
        this.partitionBarItem.tooltip = "Select the partitions to build";
        this.showBarItems();
    }

    setAsRunning() {
        this.hideBarItems();
        this.runBarItem.text = "$(primitive-square) Abort";
        this.runBarItem.command = "dssProjects.abortRecipe";
        this.showBarItems();
    }
}

export class RecipesStatusBarMap {
    private map: Map<string, RecipeStatusBar>;

    constructor() {
        this.map = new Map<string, RecipeStatusBar>();
    }

    getFromRecipe(recipe: Recipe): RecipeStatusBar | undefined {
        return this.map.get(this.keyForRecipe(recipe));
    }

    setFromRecipe(recipe: Recipe, statusBarItems: RecipeStatusBar): void {
        this.map.set(this.keyForRecipe(recipe), statusBarItems);
    }

    hideAll() {
        for (const recipeStatusBar of this.map.values()) {
            recipeStatusBar.hideBarItems();
        }
    }

    disposeAll() {
        this.map.forEach((recipeStatusBar) => {
            recipeStatusBar.disposeBarItems();
        });
    }

    showForRecipe(recipe: Recipe) {
        const existingRecipeStatusBar = this.getFromRecipe(recipe);

        if (existingRecipeStatusBar) {
            existingRecipeStatusBar.showBarItems();
        } else {
            const newRecipeStatusBar  = new RecipeStatusBar(vscode.window.createStatusBarItem(),
                                                            vscode.window.createStatusBarItem());
            newRecipeStatusBar.setAsRunnable(recipe.name);
            newRecipeStatusBar.setPartitionToBuild("");
            this.setFromRecipe(recipe, newRecipeStatusBar);
        }
    }

    deleteForRecipe(recipe: Recipe) {
        const statusBarItems = this.getFromRecipe(recipe);
        if (statusBarItems) {
            statusBarItems.partitionBarItem.dispose();
        }
        this.map.delete(this.keyForRecipe(recipe));
    }

    setAsRunning(recipe: Recipe) {
        const statusBarItems = this.getFromRecipe(recipe);
        if (statusBarItems) {
           statusBarItems.setAsRunning();
        }
    }

    setAsRunnable(recipe: Recipe) {
        const statusBarItems = this.getFromRecipe(recipe);
        if (statusBarItems) {
            statusBarItems.setAsRunnable(recipe.name);
        }
    }

    setPartitionToBuild(recipe: Recipe, partitions?: string) {
        const statusBarItems = this.getFromRecipe(recipe);
        if (statusBarItems && partitions) {
            statusBarItems.setPartitionToBuild(partitions);
        }
    }

    private keyForRecipe(recipe: Recipe): string {
        return recipe.projectKey + recipe.name;
    } 
} 
