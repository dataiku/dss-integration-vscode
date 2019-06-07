import * as vscode from 'vscode';
import { Plugin, getPluginsWithVersion } from './api/plugin';
import { TreeViewItem, PluginFileTreeView, RootPluginFolderTreeView, PluginFolderTreeView } from './treeViewItem';
import { canCreateFolderAndSafelySave } from './api/utils';

export class PluginsTreeDataProvider implements vscode.TreeDataProvider<TreeViewItem>, vscode.TextDocumentContentProvider {

	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;
    private context: vscode.ExtensionContext;
    public isFullFeatured: boolean = false;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }  
    
	public refresh(): any {
        this._onDidChangeTreeData.fire();
        this.clearPlugins();
    }
    
    public clearPlugins() {
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
            collapsibleState: item.collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            iconPath: this.iconPath(item.iconName)
        };

        if (item instanceof PluginFileTreeView) {
            treeItem.command = {
                command: "dssPlugins.openPluginFile",
                title: "Open plugin file",
                arguments: [item]
            };
        }

        if (item instanceof PluginFileTreeView) {
            if (this.isFullFeatured) {
                treeItem.contextValue = "deletableFile";
            } else {
                treeItem.contextValue = "file";
            }
        } else if (item instanceof PluginFolderTreeView) {
            if (this.isFullFeatured) {
                treeItem.contextValue = "actionableFolder";
            } else {
                treeItem.contextValue = "folder";
            }
        } else {
            if (this.isFullFeatured) {
                treeItem.contextValue = "createableItemAtRoot";
            } else {
                treeItem.contextValue = "folder";
            }
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
        const { plugins, version } = await getPluginsWithVersion();
        this.isFullFeatured = canCreateFolderAndSafelySave(version);

        return plugins.map((plugin: Plugin) => {
            return new RootPluginFolderTreeView(plugin);
        }).sort((p1, p2) => p1.label.localeCompare(p2.label));
    }    

	public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        // return this.model.getContent(uri).then(content => content);
        return "";
    }
}