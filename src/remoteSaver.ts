import { getRecipeAndPayload, RecipeAndPayload, saveRecipe } from "./api/recipe";
import { FSManager, FileDetails } from "./fsManager";
import { window, TextDocument } from "vscode";
import { roundedFormat } from "./utils";
import { WebApp, saveWebApp, getWebApp } from "./api/webapp";
import { PluginItem, savePluginFile, getPluginFileContentAndType, getPluginItemDetails } from "./api/plugin";

abstract class RemoteSaver<T> {
    protected abstract saveInDss(itemToSave: T): Promise<void>;
    protected abstract cancelSave(remoteItem: T): Promise<void>;
    protected abstract hasSameVersion(local: T, remote: T): boolean;
    protected abstract getConflictMessage(conflictingElement: T): string;
    protected abstract printSaveSuccessMsg(): void;
    protected abstract getRemoteObject(localObject: T): Promise<T>;

    protected canGetRemoteObject: boolean;

    constructor(protected fsManager: FSManager) {
        this.canGetRemoteObject = true;
    }
    
    public async save(objectToSave: T): Promise<void> {
        if (this.canGetRemoteObject) {
            const remoteObject = await this.getRemoteObject(objectToSave);
            if (this.hasSameVersion(objectToSave, remoteObject)) {
                await this.saveInDss(objectToSave);
                this.printSaveSuccessMsg();
            } else {
                const message = this.getConflictMessage(remoteObject);
                const action = await window.showErrorMessage(message, { modal: true }, SaveAction.SaveAnyway, SaveAction.Discard);
                if (action === SaveAction.SaveAnyway.toString()) {
                    await this.saveInDss(objectToSave);
                    this.printSaveSuccessMsg();
                } else if (action === SaveAction.Discard.toString()) {
                    await this.cancelSave(remoteObject);
                } else { // Cancel
                    throw new Error("Save cancelled");
                }
            }
        } else {
            await this.saveInDss(objectToSave);
            this.printSaveSuccessMsg();
        }
    }
}

enum SaveAction {
    SaveAnyway="Save anyway",
    Discard="Discard my changes",
}

export class RecipeRemoteSaver extends RemoteSaver<RecipeAndPayload> {
    protected async printSaveSuccessMsg() {
        window.showInformationMessage(`The recipe has been saved in DSS!`);
    }

    protected async saveInDss(rnpToSave: RecipeAndPayload): Promise<void> {
        await saveRecipe(rnpToSave);
    }
    
    protected async cancelSave(remoteRecipe: RecipeAndPayload): Promise<void> {
        await this.fsManager.saveInFS(FileDetails.fromRecipe(remoteRecipe));
    }

    protected getConflictMessage(conflictingElement: RecipeAndPayload): string {
        const lastModifier = conflictingElement.recipe.versionTag.lastModifiedBy.login;
        const lastModification = roundedFormat((Date.now() - conflictingElement.recipe.versionTag.lastModifiedOn));
        
        let message = "This recipe is being edited by more than one user.\n";
        message += "It has been modified about "+ lastModification + " ago by "+ lastModifier +".\n";
        return message;
    }

    protected async getRemoteObject(localRecipeAndPayload: RecipeAndPayload): Promise<RecipeAndPayload> {
        return await getRecipeAndPayload(localRecipeAndPayload.recipe);
    }  

    protected hasSameVersion(rnpLocal: RecipeAndPayload, rnpRemote: RecipeAndPayload): boolean {
        return rnpLocal.recipe.versionTag.versionNumber === rnpRemote.recipe.versionTag.versionNumber;
    }
}

export class WebAppRemoteSaver extends RemoteSaver<WebApp> {
    protected async printSaveSuccessMsg() {
        window.showInformationMessage(`The webapp has been saved in DSS!`);
    }

    protected async saveInDss(webapp: WebApp): Promise<void> {
        await saveWebApp(webapp);
    }
    
    protected async cancelSave(remoteWebapp: WebApp): Promise<void> {
        for (const file of FileDetails.fromWebApp(remoteWebapp)) {
            await this.fsManager.saveInFS(file);
        }
    }

    protected getConflictMessage(conflictingElement: WebApp): string {
        const lastModifier = conflictingElement.versionTag.lastModifiedBy.login;
        const lastModification = roundedFormat((Date.now() - conflictingElement.versionTag.lastModifiedOn));
        
        let message = "This webapp is being edited by more than one user.\n";
        message += "It has been modified about "+ lastModification + " ago by "+ lastModifier +".\n";
        return message;
    }

    protected async getRemoteObject(localWebapp: WebApp): Promise<WebApp> {
        return await getWebApp(localWebapp);
    }

    protected hasSameVersion(local: WebApp, remote: WebApp): boolean {
        return local.versionTag.versionNumber === remote.versionTag.versionNumber;
    }
}

export class PluginRemoteSaver extends RemoteSaver<PluginItem> {

    private text :string;
    private pluginId :string;
    
    constructor(fsManager: FSManager, pluginId: string, document: TextDocument, isFullyFeatured: boolean) {
        super(fsManager);
        this.pluginId = pluginId;
        this.text = document.getText();
        this.canGetRemoteObject = isFullyFeatured;
    }

    protected async printSaveSuccessMsg() {
        window.showInformationMessage(`This file has been saved in DSS!`);
    }

    protected async saveInDss(file: PluginItem): Promise<void> {
        await savePluginFile(this.pluginId, file.path, this.text);
    }
    
    protected async cancelSave(remoteFile: PluginItem): Promise<void> {
        const { content, type } = await getPluginFileContentAndType(this.pluginId, remoteFile.path);
        await this.fsManager.saveInFS(FileDetails.fromPlugin(this.pluginId, remoteFile.path, content));
    }

    protected getConflictMessage(conflictingElement: PluginItem): string {
        const lastModification = roundedFormat((Date.now() - conflictingElement.lastModified));
        let message = "This content is being edited by more than one user.\n";
        message += "It has been modified about "+ lastModification +" ago.\n";
        return message;
    }

    protected async getRemoteObject(localFile: PluginItem): Promise<PluginItem> {
        return await getPluginItemDetails(this.pluginId, localFile.path);
    }

    protected hasSameVersion(local: PluginItem, remote: PluginItem): boolean {
        return local.lastModified === remote.lastModified;
    }
}