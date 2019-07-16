import * as vscode from 'vscode';
import { TreeViewItem, RecipeFileTreeView, WebAppFileTreeView, RootPluginFolderTreeView, PluginFileTreeView, PluginFolderTreeView } from './treeViewItem';
import { ProjectsTreeDataProvider } from './projectsTreeDataProvider';
import { PluginsTreeDataProvider } from './pluginsTreeDataProvider';
import { Recipe, RecipeAndPayload, getRecipeAndPayload } from './api/recipe';
import { getWebApp, WebApp, getModifiedWebApp } from './api/webapp';
import { getPluginFileContentAndType, savePluginFile, getPluginItemDetails, removePluginContents, addPluginFolder } from './api/plugin';
import { waitJobToFinish, abortJob, startRecipe } from './api/job';
import { FSManager, FileDetails } from './fsManager';
import { StatusBarItemsMap } from './statusBarItemsMap';
import { RecipeRemoteSaver, WebAppRemoteSaver, PluginRemoteSaver } from './remoteSaver';
import { DSSConfiguration } from './dssConfiguration';
import { WT1 } from './tracker/wt1';
import { EventType } from './tracker/eventType';

interface TabBinding {
    uri: vscode.Uri;
    item: TreeViewItem;
}
let dssExtension: DSSExtension;

export async function activate(context: vscode.ExtensionContext) {

    console.log('The extension dataiku-dss has just started !');

    const projectsExplorer = new ProjectsTreeDataProvider(context);
    const projectTreeView = vscode.window.createTreeView('dssProjects', {
        treeDataProvider: projectsExplorer
    });

    const pluginsExplorer = new PluginsTreeDataProvider(context);
    const pluginTreeView = vscode.window.createTreeView('dssPlugins', {
        treeDataProvider: pluginsExplorer
    });

    const storagePath = String(context.globalStoragePath);

    const wt1 = new WT1(vscode.version);
    dssExtension = new DSSExtension(storagePath, pluginTreeView, projectTreeView, pluginsExplorer, projectsExplorer, wt1);
    
    /***    COMMANDS   ***/
    vscode.commands.registerCommand('dssProjects.refreshEntry', (actionByUser) => dssExtension.refreshProjects(actionByUser));
    vscode.commands.registerCommand('dssProjects.openCodeRecipe', (item: RecipeFileTreeView) => dssExtension.openCodeRecipeFile(item));
    vscode.commands.registerCommand('dssProjects.openWebApp', (item: WebAppFileTreeView) => dssExtension.openWebAppFile(item));
    vscode.commands.registerTextEditorCommand('dssProjects.abortRecipe', (textEditor: vscode.TextEditor) => dssExtension.abortRecipe(textEditor));
    vscode.commands.registerTextEditorCommand('dssProjects.runRecipe', (textEditor: vscode.TextEditor) => dssExtension.runRecipe(textEditor));

    vscode.commands.registerCommand('dssPlugins.refreshEntry', (actionByUser) => dssExtension.refreshPlugins(actionByUser));
    vscode.commands.registerCommand('dssPlugins.openPluginFile', (item: PluginFileTreeView) => dssExtension.openPluginFile(item));
    vscode.commands.registerCommand("dssPlugins.newFile", (parentItem: PluginFolderTreeView | RootPluginFolderTreeView) => dssExtension.addPluginFile(parentItem));
    vscode.commands.registerCommand("dssPlugins.deleteItem", (item: PluginFileTreeView | PluginFolderTreeView) => dssExtension.deletePluginItem(item));
    vscode.commands.registerCommand("dssPlugins.newFolder", (parentItem: PluginFolderTreeView | RootPluginFolderTreeView) => dssExtension.addPluginFolder(parentItem));

    /***    CONFIGURATION COMMANDS   ***/
    vscode.commands.registerCommand("setup.apiKey", () => DSSConfiguration.setApiKeyFromUserInput());
    vscode.commands.registerCommand("setup.url", () => DSSConfiguration.setUrlFromUserInut());
    vscode.commands.registerCommand("setup.deactivateCertificateCheck", () => DSSConfiguration.setCheckCertificate(false));
    vscode.commands.registerCommand("setup.activateCertificateCheck", () => DSSConfiguration.setCheckCertificate(true));
    /***    TEXT DOCUMENT EVENTS   ***/
    vscode.window.onDidChangeActiveTextEditor((textEditor: vscode.TextEditor | undefined) => dssExtension.selectTreeViewItem(textEditor));
    vscode.workspace.onWillSaveTextDocument((event) => event.waitUntil(dssExtension.saveInDss(event)));
    vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) => dssExtension.documentOnCloseCleanup(doc));

    wt1.event(EventType.START_EXTENSION);
}

export function deactivate(): void {
    dssExtension.deactivate();
}

class DSSExtension {
    tabsBinding: TabBinding[] = [];
    statusBarItemsMap: StatusBarItemsMap = new StatusBarItemsMap();

    fsManager: FSManager;
    pluginTreeView: vscode.TreeView<TreeViewItem | undefined>;
    projectTreeView: vscode.TreeView<TreeViewItem | undefined>;
    pluginsTreeDataProvider: PluginsTreeDataProvider;
    projectsTreeDataProvider: ProjectsTreeDataProvider;

    wt1: WT1;

    imagePreviewPanelsMap: Map<string, vscode.WebviewPanel> = new Map<string, vscode.WebviewPanel>();

    constructor(storagePath: string, 
                pluginTreeView: vscode.TreeView<TreeViewItem | undefined>,
                projectTreeView: vscode.TreeView<TreeViewItem | undefined>,
                pluginsTreeDataProvider: PluginsTreeDataProvider,
                projectsTreeDataProvider: ProjectsTreeDataProvider,
                wt1: WT1) {
        this.pluginTreeView = pluginTreeView;
        this.projectTreeView = projectTreeView;
        this.fsManager = new FSManager(storagePath);
        this.pluginsTreeDataProvider = pluginsTreeDataProvider;
        this.projectsTreeDataProvider = projectsTreeDataProvider;
        this.wt1 = wt1;
    }

    refreshOpenDssObject() {
        const textEditor = vscode.window.activeTextEditor;
        if (textEditor && !textEditor.document.isDirty) {
            textEditor.hide();
            const treeViewItem = this.getTreeViewItemFromUri(textEditor.document.uri);
            if (treeViewItem instanceof PluginFileTreeView) {
                this.openPluginFile(treeViewItem);
            } else if (treeViewItem instanceof RecipeFileTreeView) {
                this.openCodeRecipeFile(treeViewItem);
            } else if (treeViewItem instanceof WebAppFileTreeView) {
                this.openWebAppFile(treeViewItem);
            }
        }   
    }

    async refreshProjects(triggeredByUser: boolean = true) {
        this.projectsTreeDataProvider.refresh();
        this.refreshOpenDssObject();
        if (triggeredByUser) {
            this.wt1.event(EventType.REFRESH_PROJECT_LIST);
        }
    }

    async refreshPlugins(triggeredByUser: boolean = true) {
        this.pluginsTreeDataProvider.refresh();
        this.refreshOpenDssObject();
        if (triggeredByUser) {
            this.wt1.event(EventType.REFRESH_PLUGIN_LIST);
        }
    }

    async addPluginFolder(parentItem: PluginFolderTreeView | RootPluginFolderTreeView) {
        const folderName = await vscode.window.showInputBox();
        if (folderName) {
            try {
                await this.addPluginItem(parentItem, folderName, true);
                this.wt1.event(EventType.ADD_PLUGIN_FOLDER);
            } catch (error) {
                vscode.window.showErrorMessage(`Can not create folder with name ${folderName}`);
            }
        }
    }

    async deletePluginItem(item: PluginFileTreeView | PluginFolderTreeView) {
        await removePluginContents(item.id, item.filePath);
        if (item instanceof PluginFileTreeView) {
            this.wt1.event(EventType.DELETE_PLUGIN_FILE);
        } else {
            this.wt1.event(EventType.DELETE_PLUGIN_FOLDER);
        }
        this.refreshPlugins(false);
        vscode.window.showInformationMessage("File/folder deleted successfully");
    }
    
    async addPluginFile(parentItem: PluginFolderTreeView | RootPluginFolderTreeView) {
        const filename = await vscode.window.showInputBox();
        if (filename) {
            try {
                await this.addPluginItem(parentItem, filename, false);
                this.wt1.event(EventType.ADD_PLUGIN_FILE);
            } catch {
                vscode.window.showErrorMessage(`Can not create file with name ${filename}`);
            }
        }
    }
    
    async runRecipe(textEditor: vscode.TextEditor) {
        const document = textEditor.document;
    
        if (document.isDirty) {
            await document.save();
        }
        const item = this.getTreeViewItemFromUri(document.uri) as RecipeFileTreeView;
        const recipe = item.dssObject;
        this.statusBarItemsMap.setAsRunning(recipe);
        try {
            const result = await startRecipe(recipe);
            this.wt1.event(EventType.RUN_RECIPE, { recipeType: recipe.type });
            item.jobId = result.id;
            const outputChannel = vscode.window.createOutputChannel("Job "+ result.id);
            const job = await waitJobToFinish(outputChannel, recipe.projectKey, result.id);
            vscode.window.showInformationMessage(`Job ${result.id} finished with status: ${job.baseStatus.state.toString()}`);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
            throw e;
        } finally {
            this.statusBarItemsMap.setAsRunnable(recipe);
        } 
    }
    
    async abortRecipe(textEditor: vscode.TextEditor) {
        const item = this.getTreeViewItemFromUri(textEditor.document.uri) as RecipeFileTreeView;
        if (item.jobId) {
            const recipe = item.dssObject;
            await abortJob(recipe.projectKey, item.jobId);
            this.wt1.event(EventType.ABORT_RECIPE, { recipeType: recipe.type });
            this.statusBarItemsMap.setAsRunnable(recipe);
        } else {
            throw new Error("No job is running for this recipe");
        }
    }
    
    async openCodeRecipeFile(item: RecipeFileTreeView) {
        const recipe = item.dssObject;
        const recipeAndPayload = await getRecipeAndPayload(recipe);
        item.dssObject.versionTag = recipeAndPayload.recipe.versionTag;
        const filePath = await this.fsManager.saveInFS(FileDetails.fromRecipe(recipeAndPayload));
        const document = await this.openTextDocumentSafely(filePath, item);
        this.wt1.event(EventType.OPEN_RECIPE, { recipeType: recipe.type, lineCount: document.lineCount, languageId: document.languageId }); 
        this.statusBarItemsMap.showForRecipe(recipe);
    }
    
    async openPluginFile(item: PluginFileTreeView) {
        const pluginId = item.id;
        const { content, type } = await getPluginFileContentAndType(pluginId, item.filePath);
        if (type && type.startsWith("image")) {
            let panel = this.imagePreviewPanelsMap.get(pluginId+item.filePath);
            if (panel === undefined) {
                panel = vscode.window.createWebviewPanel("image-preview", item.filePath, vscode.ViewColumn.One);
                panel.onDidDispose(() => this.imagePreviewPanelsMap.delete(pluginId+item.filePath));
                this.imagePreviewPanelsMap.set(pluginId+item.filePath, panel);
            }
            panel.reveal();
            panel.webview.html = `<html><body><img src="data:${type};base64,${content}"></body></html>`;
            this.wt1.event(EventType.OPEN_PLUGIN_FILE, { pluginFileType: type }); 
        } else {
            if (this.pluginsTreeDataProvider.isFullFeatured) {
                const saved = await getPluginItemDetails(item.id, item.filePath);
                item.dssObject.lastModified = saved.lastModified;
            }
            const fsPath = await this.fsManager.saveInFS(FileDetails.fromPlugin(pluginId, item.filePath, content));
            const document = await this.openTextDocumentSafely(fsPath, item);
            this.wt1.event(EventType.OPEN_PLUGIN_FILE, { pluginFileType: type, languageId: document.languageId, lineCount: document.lineCount }); 
        }
    }
    
    async openWebAppFile(item: WebAppFileTreeView) {
        const webApp = await getWebApp(item.parent.dssObject);
        item.dssObject.versionTag = webApp.versionTag;
        const files = FileDetails.fromWebApp(webApp);
        for (const file of files) {
            if (file.name === item.label) {
                const filePath = await this.fsManager.saveInFS(file);
                const document = await this.openTextDocumentSafely(filePath, item);
                this.wt1.event(EventType.OPEN_PLUGIN_FILE, { lineCount: document.lineCount, languageId: document.languageId }); 
            }
        }
    }
    
    async openTextDocumentSafely(filePath: string, item: TreeViewItem): Promise<vscode.TextDocument> {
        const textEditor = await this.openTextDocument(filePath);
        this.addTabBinding(textEditor, item);
        return textEditor.document;
    }
    
    async saveInDss(event: vscode.TextDocumentWillSaveEvent) {
        const doc = event.document;
        let item = this.getTreeViewItemFromUri(doc.uri);
        if (item instanceof RecipeFileTreeView) {
            let rnp: RecipeAndPayload = {
                recipe: item.dssObject,
                payload: doc.getText()
            };
            await new RecipeRemoteSaver(this.fsManager, this.wt1).save(rnp);
            const saved = await getRecipeAndPayload(rnp.recipe);
            item.dssObject.versionTag = saved.recipe.versionTag;
        } else if (item instanceof WebAppFileTreeView) { 
            const webAppNew = getModifiedWebApp(item.dssObject, item.label, doc.getText());
            await new WebAppRemoteSaver(this.fsManager, this.wt1).save(webAppNew);
            const saved = await getWebApp(webAppNew);
            item.dssObject.versionTag = saved.versionTag;
        } else if (item instanceof PluginFileTreeView) {
            await new PluginRemoteSaver(this.fsManager, this.wt1, item.id, doc, this.pluginsTreeDataProvider.isFullFeatured).save(item.dssObject);
            if (this.pluginsTreeDataProvider.isFullFeatured) {
                const saved = await getPluginItemDetails(item.id, item.filePath);
                item.dssObject.lastModified = saved.lastModified;
            }
        }
    }
    
    selectTreeViewItem(textEditor: vscode.TextEditor | undefined) {
        this.statusBarItemsMap.hideAll();
        if (!textEditor) {
            return;
        }
        let item = this.getTreeViewItemFromUri(textEditor.document.uri);
        if (item) {
            if (item instanceof RootPluginFolderTreeView) {
                this.pluginTreeView.reveal(item);
            } else {
                if (item instanceof RecipeFileTreeView) {
                    this.statusBarItemsMap.showForRecipe(item.dssObject);
                }
                this.projectTreeView.reveal(item);
            }
        }
    }

    deactivate(): void {
        this.statusBarItemsMap.disposeAll();
        this.fsManager.cleanFS();
    }
    
    documentOnCloseCleanup(doc: vscode.TextDocument) {
        const item = this.getTreeViewItemFromUri(doc.uri);
        if (item instanceof RecipeFileTreeView) {
            this.statusBarItemsMap.deleteForRecipe(item.dssObject);
        }
    }

    private async addPluginItem(parentItem: PluginFolderTreeView | RootPluginFolderTreeView, name: string, folder: boolean) {
        let path;
        if (parentItem instanceof PluginFolderTreeView) {
            path = parentItem.filePath + "/" + name;
        } else {
            path = name;
        }
        if (folder) {
            await addPluginFolder(parentItem.id, path);
        } else {
            await savePluginFile(parentItem.id, path, "");
        }
        this.refreshPlugins(false);
    }

    private addTabBinding(textEditor: vscode.TextEditor, item: TreeViewItem) {
        this.tabsBinding.push({uri: textEditor.document.uri, item: item });
    }
    
    private openTextDocument(filePath: string): Thenable<vscode.TextEditor> {
        return vscode.workspace.openTextDocument(filePath).then(doc => {
            return vscode.window.showTextDocument(doc);
        });
    }
    
    private getTreeViewItemFromUri(uri: vscode.Uri): TreeViewItem | undefined {
        for (let binding of this.tabsBinding) {
            if (binding.uri.path === uri.path) {
                return binding.item;
            }
        }
        return undefined;
    }
}
