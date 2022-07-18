import * as vscode from 'vscode';
import { Project, getProjectsWithVersion } from './api/project';
import {
    TreeViewItem,
    sortTreeViewItems,
    RecipeFileTreeView,
    WebAppsFolderTreeView,
    WebAppFolderTreeView,
    WebAppFileTreeView,
    ProjectsFolderTreeView,
    WikiFolderTreeView,
    WikiArticleTreeView,
    RecipesFolderTreeView,
    RootLibraryFolderTreeView,
    LibraryFolderTreeView,
    LibraryFileTreeView
} from './treeViewItem';
import { canEditWebApp } from './api/utils';


export class ProjectsTreeDataProvider implements vscode.TreeDataProvider<TreeViewItem>, vscode.TextDocumentContentProvider {

	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;
    
    constructor(private context: vscode.ExtensionContext) {
    }

	public refresh(): any {
        this._onDidChangeTreeData.fire();
	}

    public getParent(element?: TreeViewItem): TreeViewItem | undefined {
        return (element) ? element.parent : undefined;
    }

    public iconPath(iconName: string) {
        return {
            light: this.context.extensionPath + '/resources/images/light/' + iconName + '.svg',
            dark: this.context.extensionPath + '/resources/images/dark/' + iconName + '.svg'
        };
    }

	public getTreeItem(item: TreeViewItem): vscode.TreeItem {
		let treeItem: vscode.TreeItem = {
            label: item.label,
            iconPath: this.iconPath(item.iconName),
            collapsibleState: item.collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        };
        if (item instanceof RecipeFileTreeView) {
            treeItem.command = {
                command: "dssProjects.openCodeRecipe",
                title: "Open code recipe",
                arguments: [item]
            };
            treeItem.contextValue = "recipe";
        } else if (item instanceof RecipesFolderTreeView) {
            treeItem.contextValue = "recipeFolder"
        } else if (item instanceof WebAppsFolderTreeView) {
            treeItem.contextValue = "webappRootFolder"
        } else if (item instanceof WebAppFileTreeView) {
            treeItem.command = {
                command: "dssProjects.openWebApp",
                title: "Open web app",
                arguments: [item]
            };
        } else if (item instanceof WebAppFolderTreeView) {
            treeItem.contextValue = "webappFolder";
        } else if (item instanceof ProjectsFolderTreeView) {
            treeItem.contextValue = "projectFolder";
        } else if (item instanceof WikiArticleTreeView) {
            treeItem.command = {
                command: "dssProjects.openWikiArticle",
                title: "Open wiki article",
                arguments: [item]
            };
            treeItem.contextValue = "wikiArticle";
        } else if (item instanceof WikiFolderTreeView) {
            treeItem.contextValue = "wikiFolder";
        } else if (item instanceof RootLibraryFolderTreeView) {
            treeItem.contextValue = "libraryRootFolder";
        } else if (item instanceof LibraryFolderTreeView) {
            treeItem.contextValue = "libraryFolder";
        } else if (item instanceof LibraryFileTreeView) {
            treeItem.contextValue = "libraryFile";
            treeItem.command = {
                command: "dssProjects.openLibraryFile",
                title: "Open library file",
                arguments: [item]
            };
        }
        return treeItem;
	}

    public getChildren(parentItem: TreeViewItem): Thenable<TreeViewItem[]> | TreeViewItem[] {
        if (parentItem) {
            return parentItem.getChildren();
        } else {
            return this.getRoots();
        }
    }

    public async getRoots(): Promise<TreeViewItem[]> {
        const { projects, version } =  await getProjectsWithVersion();
        return projects.map((project: Project) => {
            return new ProjectsFolderTreeView(project, canEditWebApp(version));
        }).sort(sortTreeViewItems);
    }
    
	public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        return "";
    }
    
}