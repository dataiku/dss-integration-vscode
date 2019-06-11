import * as vscode from "vscode";
import { Recipe } from "./api/recipe";

interface RecipeStatusBarItems {
    runBarItem: vscode.StatusBarItem;
    partitionBarItem: vscode.StatusBarItem;
}

export class RecipeStatusBarItemsMap {
    private map: Map<string, RecipeStatusBarItems>;

    constructor() {
        this.map = new Map<string, RecipeStatusBarItems>();
    }

    getFromRecipe(recipe: Recipe): RecipeStatusBarItems | undefined {
        return this.map.get(this.keyForRecipe(recipe));
    }

    setFromRecipe(recipe: Recipe, statusBarItems: RecipeStatusBarItems): void {
        this.map.set(this.keyForRecipe(recipe), statusBarItems);
    }

    hideAll() {
        for (const statusBarItem of this.map.values()) {
            statusBarItem.partitionBarItem.hide();
            statusBarItem.runBarItem.hide();
        }
    }

    disposeAll() {
        this.map.forEach((statusBarItems) => {
            statusBarItems.partitionBarItem.dispose();
            statusBarItems.runBarItem.dispose();
        });
    }

    showForRecipe(recipe: Recipe) {
        const existingStatusBarItems = this.getFromRecipe(recipe);

        if (existingStatusBarItems) {
            existingStatusBarItems.partitionBarItem.show();
            existingStatusBarItems.runBarItem.show();
        } else {
            const runBarItem = vscode.window.createStatusBarItem();
            const partitionBarItem = vscode.window.createStatusBarItem();
            this.setFromRecipe(recipe, { partitionBarItem, runBarItem  });
            this.setAsRunnable(recipe);
            this.setPartitionToBuild(recipe, "");
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
            statusBarItems.runBarItem.text = "$(primitive-square) Abort";
            statusBarItems.runBarItem.command = "dssProjects.abortRecipe";
            statusBarItems.runBarItem.show();
        }
    }

    setAsRunnable(recipe: Recipe) {
        const statusBarItems = this.getFromRecipe(recipe);
        if (statusBarItems) {
            statusBarItems.runBarItem.text = "$(play) Run " + recipe.name;
            statusBarItems.runBarItem.command = "dssProjects.runRecipe";
            statusBarItems.runBarItem.tooltip = "Run this recipe in DSS";
            statusBarItems.runBarItem.show();
        }
    }

    setPartitionToBuild(recipe: Recipe, partitions?: string) {
        const statusBarItems = this.getFromRecipe(recipe);
        if (statusBarItems && partitions) {
            statusBarItems.partitionBarItem.hide();
            statusBarItems.partitionBarItem.text = partitions;
            statusBarItems.partitionBarItem.command = "dssProjects.selectPartitions";
            statusBarItems.partitionBarItem.tooltip = "Select the partitions to build";
            statusBarItems.partitionBarItem.show();
        }
    }

    private keyForRecipe(recipe: Recipe): string {
        return recipe.projectKey + recipe.name;
    } 
} 
