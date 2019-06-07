import * as vscode from "vscode";
import { Recipe } from "./api/recipe";

export class StatusBarItemsMap {
    private map: Map<string, vscode.StatusBarItem>;

    constructor() {
        this.map = new Map<string, vscode.StatusBarItem>();
    }
    getFromRecipe(recipe: Recipe): vscode.StatusBarItem | undefined {
        return this.map.get(this.keyForRecipe(recipe));
    }

    setFromRecipe(recipe: Recipe, statusBarItem: vscode.StatusBarItem): void {
        this.map.set(this.keyForRecipe(recipe), statusBarItem);
    }

    hideAll() {
        this.map.forEach((statusBar) => {
            statusBar.hide();
        });
    }

    disposeAll() {
        this.map.forEach((statusBar) => {
            statusBar.dispose();
        });
    }

    showForRecipe(recipe: Recipe) {
        const existingBarItem = this.getFromRecipe(recipe);
        const statusBarItem = vscode.window.createStatusBarItem();
        if (existingBarItem) {
            statusBarItem.text = recipe.name;
            statusBarItem.command = statusBarItem.command;
            statusBarItem.tooltip = statusBarItem.tooltip;
            existingBarItem.show();
        } else {
            this.setFromRecipe(recipe, statusBarItem);
            this.setAsRunnable(recipe);
            statusBarItem.show();
        }
    }

    deleteForRecipe(recipe: Recipe) {
        const statusBar = this.getFromRecipe(recipe);
        if (statusBar) {
            statusBar.dispose();
        }
        this.map.delete(this.keyForRecipe(recipe));
    }

    setAsRunning(recipe: Recipe) {
        const statusBar = this.getFromRecipe(recipe);
        if (statusBar) {
            statusBar.text = "$(primitive-square) Abort";
            statusBar.command = "dssProjects.abortRecipe";
            statusBar.show();
        }
    }

    setAsRunnable(recipe: Recipe) {
        const statusBar = this.getFromRecipe(recipe);
        if (statusBar) {
            statusBar.text = "$(play) Run " + recipe.name;
            statusBar.command = "dssProjects.runRecipe";
            statusBar.tooltip = "Run this recipe in DSS";
            statusBar.show();
        }
    }

    private keyForRecipe(recipe: Recipe): string {
        return recipe.projectKey + recipe.name;
    } 
} 
