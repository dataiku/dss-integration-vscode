import * as vscode from 'vscode';
import { TreeViewItem, RecipeFileTreeView, WebAppFileTreeView, WikiArticleTreeView, RootPluginFolderTreeView, PluginFileTreeView, PluginFolderTreeView } from './treeViewItem';
import { ProjectsTreeDataProvider } from './projectsTreeDataProvider';
import { PluginsTreeDataProvider } from './pluginsTreeDataProvider';
import { Recipe, RecipeAndPayload, getRecipeAndPayload } from './api/recipe';
import { getWebApp, WebApp, getModifiedWebApp } from './api/webapp';
import { getWikiArticle, WikiArticle } from './api/wiki';
import { getPluginFileContentAndType, savePluginFile, getPluginItemDetails, removePluginContents, addPluginFolder } from './api/plugin';
import { waitJobToFinish, abortJob, startRecipe, promptPartitions, isPartitioned } from './api/job';
import { FSManager, FileDetails } from './FSManager';
import { RecipesStatusBarMap } from './statusBarItemsMap';
import { RecipeRemoteSaver, WebAppRemoteSaver, WikiArticleRemoteSaver, PluginRemoteSaver } from './remoteSaver';
import { DSSConfiguration } from './dssConfiguration';
import { getOuputToBuild } from './api/recipeOutput';

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
    dssExtension = new DSSExtension(storagePath, pluginTreeView, projectTreeView, pluginsExplorer, projectsExplorer);
    
    /***    COMMANDS   ***/
    vscode.commands.registerCommand('dssProjects.refreshEntry', () => dssExtension.refreshProjects());
    vscode.commands.registerCommand('dssProjects.openCodeRecipe', (item: RecipeFileTreeView) => dssExtension.openCodeRecipeFile(item));
    vscode.commands.registerCommand('dssProjects.openWebApp', (item: WebAppFileTreeView) => dssExtension.openWebAppFile(item));
    vscode.commands.registerCommand('dssProjects.openWikiArticle', (item: WikiArticleTreeView) => dssExtension.openWikiArticleFile(item));
    vscode.commands.registerTextEditorCommand('dssProjects.abortRecipe', (textEditor: vscode.TextEditor) => dssExtension.abortRecipe(textEditor));
    vscode.commands.registerTextEditorCommand('dssProjects.runRecipe', (textEditor: vscode.TextEditor) => dssExtension.runRecipe(textEditor));
    vscode.commands.registerTextEditorCommand('dssProjects.selectPartitions', (textEditor: vscode.TextEditor) => dssExtension.selectPartitions(textEditor));

    vscode.commands.registerCommand('dssPlugins.refreshEntry', () => dssExtension.refreshPlugins());
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
}

export function deactivate(): void {
    dssExtension.deactivate();
}

class DSSExtension {
    tabsBinding: TabBinding[] = [];
    statusBarItemsMap: RecipesStatusBarMap = new RecipesStatusBarMap();

    fsManager: FSManager;
    pluginTreeView: vscode.TreeView<TreeViewItem | undefined>;
    projectTreeView: vscode.TreeView<TreeViewItem | undefined>;
    pluginsTreeDataProvider: PluginsTreeDataProvider;
    projectsTreeDataProvider: ProjectsTreeDataProvider;

    imagePreviewPanelsMap: Map<string, vscode.WebviewPanel> = new Map<string, vscode.WebviewPanel>();

    constructor(storagePath: string, 
                pluginTreeView: vscode.TreeView<TreeViewItem | undefined>,
                projectTreeView: vscode.TreeView<TreeViewItem | undefined>,
                pluginsTreeDataProvider: PluginsTreeDataProvider,
                projectsTreeDataProvider: ProjectsTreeDataProvider) {
        this.pluginTreeView = pluginTreeView;
        this.projectTreeView = projectTreeView;
        this.fsManager = new FSManager(storagePath);
        this.pluginsTreeDataProvider = pluginsTreeDataProvider;
        this.projectsTreeDataProvider = projectsTreeDataProvider;
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
            } else if (treeViewItem instanceof WikiArticleTreeView) {
                this.openWikiArticleFile(treeViewItem);
            }
        }   
    }

    async refreshProjects() {
        this.projectsTreeDataProvider.refresh();
        this.refreshOpenDssObject();
    }

    async refreshPlugins() {
        this.pluginsTreeDataProvider.refresh();
        this.refreshOpenDssObject();
    }

    async addPluginFolder(parentItem: PluginFolderTreeView | RootPluginFolderTreeView) {
        const folderName = await vscode.window.showInputBox();
        if (folderName) {
            try {
                await this.addPluginItem(parentItem, folderName, true);
            } catch (error) {
                vscode.window.showErrorMessage(`Can not create folder with name ${folderName}`);
            }
        }
    }

    async deletePluginItem(item: PluginFileTreeView | PluginFolderTreeView) {
        await removePluginContents(item.id, item.filePath);
        vscode.commands.executeCommand("dssPlugins.refreshEntry");
        vscode.window.showInformationMessage("File/folder deleted successfully");
    }
    
    async addPluginFile(parentItem: PluginFolderTreeView | RootPluginFolderTreeView) {
        const filename = await vscode.window.showInputBox();
        if (filename) {
            try {
                await this.addPluginItem(parentItem, filename, false);
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
            const output = await getOuputToBuild(recipe);
            if (!output) {
                throw new Error(`Recipe ${recipe.name} can not be run: it has no outputs`);
            }
            let partition;
            if (isPartitioned(output)) {
                const statusBarPartitionItem = this.statusBarItemsMap.getFromRecipe(recipe);
                if (statusBarPartitionItem && statusBarPartitionItem.partitionBarItem.text) {
                    partition = statusBarPartitionItem.partitionBarItem.text;
                } else {
                    partition = await promptPartitions(output);
                    this.statusBarItemsMap.setPartitionToBuild(recipe, partition);
                }
            }
            
            const result = await startRecipe(recipe, output, partition);
            item.jobId = result.id;
            const outputChannel = vscode.window.createOutputChannel("Job "+ result.id);
            const job = await waitJobToFinish(outputChannel, recipe.projectKey, result.id);
            vscode.window.showInformationMessage(`Job finished with status: ${job.baseStatus.state.toString()}`);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
            throw e;
        } finally {
            this.statusBarItemsMap.setAsRunnable(recipe);
        } 
    }

    async selectPartitions(textEditor: vscode.TextEditor) {
        const document = textEditor.document;
        const item = this.getTreeViewItemFromUri(document.uri) as RecipeFileTreeView;
        const recipe = item.dssObject;
        const output = await getOuputToBuild(recipe);
        if (!output) {
            throw new Error(`Recipe ${recipe.name} can not be run: it has no outputs`);
        }
        const partition = await promptPartitions(output);
        this.statusBarItemsMap.setPartitionToBuild(recipe, partition);
    }
    
    async abortRecipe(textEditor: vscode.TextEditor) {
        const item = this.getTreeViewItemFromUri(textEditor.document.uri) as RecipeFileTreeView;
        if (item.jobId) {
            const recipe = item.dssObject;
            await abortJob(recipe.projectKey, item.jobId);
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
        await this.openTextDocumentSafely(filePath, item);    
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
        } else {
            if (this.pluginsTreeDataProvider.isFullFeatured) {
                const saved = await getPluginItemDetails(item.id, item.filePath);
                item.dssObject.lastModified = saved.lastModified;
            }
            const fsPath = await this.fsManager.saveInFS(FileDetails.fromPlugin(pluginId, item.filePath, content));
            this.openTextDocumentSafely(fsPath, item);
        }
    }
    
    openWebAppFile(item: WebAppFileTreeView) {
        getWebApp(item.parent.dssObject).then((webApp: WebApp) => {
            item.dssObject.versionTag = webApp.versionTag;
            const files = FileDetails.fromWebApp(webApp);
            for (const file of files) {
                if (file.name === item.label) {
                    this.fsManager.saveInFS(file).then((filePath: string) => {
                        this.openTextDocumentSafely(filePath, item);
                    });
                }
            }
        });
    }
    
    async openWikiArticleFile(item: WikiArticleTreeView) {
        item.dssObject = await getWikiArticle(item.dssObject.article.projectKey, item.dssObject.article.id);
        const filePath = await this.fsManager.saveInFS(FileDetails.fromWikiArticle(item.dssObject));
        await this.openTextDocumentSafely(filePath, item);    
    }
    
    async openTextDocumentSafely(filePath: string, item: TreeViewItem): Promise<void> {
        const textEditor = await this.openTextDocument(filePath);
        this.addTabBinding(textEditor, item);
    }
    
    async saveInDss(event: vscode.TextDocumentWillSaveEvent) {
        const doc = event.document;
        let item = this.getTreeViewItemFromUri(doc.uri);
        if (item instanceof RecipeFileTreeView) {
            let rnp: RecipeAndPayload = {
                recipe: (item.dssObject as Recipe),
                payload: doc.getText()
            };
            await new RecipeRemoteSaver(this.fsManager).save(rnp);
            const saved = await getRecipeAndPayload(rnp.recipe);
            item.dssObject.versionTag = saved.recipe.versionTag;
        } else if (item instanceof WebAppFileTreeView) { 
            const webAppNew = getModifiedWebApp(item.dssObject, item.label, doc.getText());
            await new WebAppRemoteSaver(this.fsManager).save(webAppNew);
            const saved = await getWebApp(webAppNew);
            item.dssObject.versionTag = saved.versionTag;
        } else if (item instanceof PluginFileTreeView) {
            await new PluginRemoteSaver(this.fsManager, item.id, doc, this.pluginsTreeDataProvider.isFullFeatured).save(item.dssObject);
            if (this.pluginsTreeDataProvider.isFullFeatured) {
                const saved = await getPluginItemDetails(item.id, item.filePath);
                item.dssObject.lastModified = saved.lastModified;
            }
        } else if (item instanceof WikiArticleTreeView) {
            let wikiArticle: WikiArticle = {
                article: item.dssObject.article,
                payload: doc.getText() 
            };
            await new WikiArticleRemoteSaver(this.fsManager).save(wikiArticle);
            const saved = await getWikiArticle(item.dssObject.article.projectKey, item.dssObject.article.id);
            item.dssObject.article.versionTag = saved.article.versionTag;
        }
    }
    
    selectTreeViewItem(textEditor: vscode.TextEditor | undefined) {
        if (textEditor && textEditor.document.languageId === "Log") {
            return; // Open the output window will trigger onDidChangeActiveTextEditor, but we want to silent it
        }
        this.statusBarItemsMap.hideAll();
        if (textEditor) { // textEditor is undefined when the last active text editor is closed
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
        vscode.commands.executeCommand("dssPlugins.refreshEntry");
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
