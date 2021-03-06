import { FileDetails } from "./FSManager";
import { Project } from "./api/project";
import { Recipe, getCodeRecipes } from "./api/recipe";
import { WebAppDetails, getWebApps, getWebApp, WebApp } from "./api/webapp";
import { getWiki, getWikiArticlesWithTaxonomies, WikiArticleWithTaxonomy, WikiTaxonomy, WikiArticle } from "./api/wiki";
import { Plugin, PluginItem, getPluginContents } from "./api/plugin";

const supportedExtensions = ['css', 'html', 'js', 'json', 'txt'];

export interface TreeViewItem {
    label: string;
    iconName: string;
    collapsible: boolean;
    parent?: TreeViewItem;

    getChildren(): Thenable<TreeViewItem[]> | TreeViewItem[];
}

export interface OpenableInDSS {
    urlInDSS(): string;
}

export class ProjectsFolderTreeView implements TreeViewItem, OpenableInDSS{
    label: string;
    iconName: string;
    collapsible: boolean;
    parent?: TreeViewItem | undefined;

    dssObject: Project;
    canEditWebApp: boolean;
    constructor(project: Project, canEditWebApp: boolean) {
        this.label = project.name;
        this.iconName = "project";
        this.collapsible = true;
        this.dssObject = project;
        this.canEditWebApp = canEditWebApp;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        if (this.canEditWebApp) {
            return [new RecipesFolderTreeView(this), new WebAppsFolderTreeView(this), new WikiFolderTreeView(this)];         
        } else {
            return [new RecipesFolderTreeView(this), new WikiFolderTreeView(this)];
        }
    }

    public urlInDSS(): string {
        return `projects/${this.dssObject.projectKey}/`;
    }
}

export class RecipesFolderTreeView implements TreeViewItem, OpenableInDSS {
    label: string;
    iconName: string;
    collapsible: boolean;
    parent: ProjectsFolderTreeView;

    constructor(parentItem: ProjectsFolderTreeView) {
        this.label = "Recipes";
        this.iconName = "recipe";
        this.collapsible = true;
        this.parent = parentItem;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const recipes = await getCodeRecipes(this.parent.dssObject.projectKey);
        return recipes.map((recipe: Recipe) => {
            return new RecipeFileTreeView(recipe, this);
        }).sort(sortTreeViewItems);
    }

    public urlInDSS(): string {
        return `projects/${this.parent.dssObject.projectKey}/recipes/`;
    } 
}

export class RecipeFileTreeView implements TreeViewItem, OpenableInDSS {
    label: string;
    iconName: string;
    collapsible: boolean;
    parent?: TreeViewItem | undefined;
    jobId?: string;
    dssObject: Recipe;

    constructor(recipe: Recipe, parentItem: TreeViewItem) {
        this.label = recipe.name;
        this.iconName = `recipe-${recipe.type}`;
        this.collapsible = false;
        this.parent = parentItem;
        this.dssObject = recipe;
    }

    getChildren(): TreeViewItem[] | Thenable<TreeViewItem[]> {
        return [];
    }

    public urlInDSS(): string {
        return `projects/${this.dssObject.projectKey}/recipes/${this.dssObject.name}/`;
    } 
}

export class WebAppsFolderTreeView implements TreeViewItem, OpenableInDSS {
    label: string;    
    iconName: string;
    collapsible: boolean;
    parent: ProjectsFolderTreeView;

    constructor(parentItem: ProjectsFolderTreeView) {
        this.label = "Webapps";
        this.iconName = "webapp";
        this.collapsible = true;
        this.parent = parentItem;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const webapps = await getWebApps(this.parent.dssObject.projectKey);
        return webapps.map((webApp: WebAppDetails) => {
            return new WebAppFolderTreeView(webApp, this);
        }).sort(sortTreeViewItems);
    }

    public urlInDSS(): string {
        return `projects/${this.parent.dssObject.projectKey}/webapps/`;
    } 
}

export class WebAppFolderTreeView implements TreeViewItem, OpenableInDSS {
    label: string;
    iconName: string;
    collapsible: boolean;
    parent: WebAppsFolderTreeView;
    dssObject: WebAppDetails;

    constructor(webappDetails: WebAppDetails, parentItem: WebAppsFolderTreeView) {
        this.label = webappDetails.name;
        this.iconName = "folder";
        this.collapsible = true;
        this.parent = parentItem;
        this.dssObject = webappDetails;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const webapp = await getWebApp(this.dssObject);
        const files = FileDetails.fromWebApp(webapp);
        return files.map(file => new WebAppFileTreeView(webapp, file, this)) ;
    }

    public urlInDSS(): string {
        return `projects/${this.dssObject.projectKey}/webapps/${this.dssObject.id}_${this.dssObject.name}/view`;
    }
}

export class WebAppFileTreeView implements TreeViewItem {
    label: string;
    iconName: string;
    collapsible: boolean;
    parent: WebAppFolderTreeView;
    dssObject: WebApp;
    file: FileDetails;

    constructor(webapp: WebApp, file: FileDetails, parentItem: WebAppFolderTreeView) {
        this.label = file.name;
        this.file = file;
        const extension = file.name.substr(file.name.lastIndexOf('.') + 1);
        this.iconName = 'file' + (supportedExtensions.indexOf(extension) >= 0 ? '-' + extension : '');
        this.collapsible = false;
        this.parent = parentItem;
        this.dssObject = webapp;
    }

    getChildren(): TreeViewItem[] | Thenable<TreeViewItem[]> {
        throw new Error("Method not implemented.");
    }
}

export class WikiFolderTreeView implements TreeViewItem, OpenableInDSS {
    label: string;    
    iconName: string;
    collapsible: boolean;
    parent: ProjectsFolderTreeView;

    constructor(parentItem: ProjectsFolderTreeView) {
        this.label = "Wiki";
        this.iconName = "wiki";
        this.collapsible = true;
        this.parent = parentItem;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const wiki = await getWiki(this.parent.dssObject.projectKey);
        if (wiki.taxonomy) {
            const wikiArticlesWithTaxonomies = await getWikiArticlesWithTaxonomies(this.parent.dssObject.projectKey, wiki.taxonomy);
            return wikiArticlesWithTaxonomies.map((wikiArticleWithTaxonomy) => {
                return new WikiArticleTreeView(wikiArticleWithTaxonomy, this);
            }).sort(sortTreeViewItems);
        }
        else {
            return [];
        }
    }

    public urlInDSS(): string {
        return `projects/${this.parent.dssObject.projectKey}/wiki/`;
    }
}

export class WikiArticleTreeView implements TreeViewItem, OpenableInDSS {
    label: string;
    iconName: string;
    collapsible: boolean;
    parent: WikiFolderTreeView | WikiArticleTreeView;
    taxonomy: WikiTaxonomy;
    dssObject: WikiArticle;

    constructor(wikiArticleWithTaxonomy: WikiArticleWithTaxonomy, parentItem: WikiFolderTreeView | WikiArticleTreeView) {
        this.dssObject = wikiArticleWithTaxonomy.article;
        this.label = this.dssObject.article.name;
        this.iconName = 'wiki';
        this.parent = parentItem;
        this.taxonomy = wikiArticleWithTaxonomy.taxonomy;

        this.collapsible = this.taxonomy.children.length ? true: false;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const wikiArticlesWithTaxonomies = await getWikiArticlesWithTaxonomies(this.dssObject.article.projectKey, this.taxonomy.children);
        return wikiArticlesWithTaxonomies.map((wikiArticleWithTaxonomy) => {
            return new WikiArticleTreeView(wikiArticleWithTaxonomy, this);
        }).sort(sortTreeViewItems);
    }

    public urlInDSS(): string {
        return `projects/${this.dssObject.article.projectKey}/wiki/${this.dssObject.article.id}/`;
    }
}

export class RootPluginFolderTreeView implements TreeViewItem, OpenableInDSS {
    dssObject: Plugin;
    label: string;
    id: string;
    iconName: string;
    collapsible: boolean;

    constructor(plugin: Plugin) {
        this.dssObject = plugin;
        this.label = plugin.meta.label;
        this.id = plugin.id;
        this.iconName = "plugin";
        this.collapsible = true;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const content = await getPluginContents(this.id);
        const children: TreeViewItem[] = [];
        content.forEach((item) => {
            if (item.children !== undefined) { // this is a folder 
                children.push(new PluginFolderTreeView(item, this));
            } else { // file
                children.push(new PluginFileTreeView(item, this));
            }
        });
        return children;
    }

    public urlInDSS(): string {
        return `plugins/development/${this.dssObject.id}/editor/`;
    }
} 

export class PluginFolderTreeView implements TreeViewItem {
    label: string;    
    iconName: string;
    collapsible: boolean;
    parent: TreeViewItem;
    children: PluginItem[];
    id: string;
    filePath: string;

    constructor(item: PluginItem, parentItem: RootPluginFolderTreeView | PluginFolderTreeView) {
        this.label = item.name;
        this.iconName = "folder";
        this.collapsible = true;
        this.parent = parentItem;
        this.children = item.children!;
        this.id = parentItem.id;
        this.filePath = item.path;
    }

    async getChildren(): Promise<TreeViewItem[]> {
        const children: TreeViewItem[] = [];
        this.children.forEach((item) => {
            if (item.children !== undefined) { // this is a folder 
                children.push(new PluginFolderTreeView(item, this));
            } else { // file
                children.push(new PluginFileTreeView(item, this));
            }
        });
        return children;
    }
}

export class PluginFileTreeView implements TreeViewItem {
    label: string;
    filePath: string;
    id: string;
    iconName: string;
    collapsible: boolean;
    file: FileDetails;
    dssObject: PluginItem;
    parent: RootPluginFolderTreeView | PluginFolderTreeView;

    constructor(pluginItem: PluginItem, parent: RootPluginFolderTreeView | PluginFolderTreeView) {
        this.label = pluginItem.name;
        this.id = parent.id;
        this.parent = parent;
        this.filePath = pluginItem.path;
        this.file =  FileDetails.fromPlugin(this.id, pluginItem.path, "");
        const extension = this.file.name.substr(this.file.name.lastIndexOf('.') + 1);
        this.iconName = 'file' + (supportedExtensions.indexOf(extension) >= 0 ? '-' + extension : '');
        this.collapsible = false;
        this.dssObject = pluginItem;
    }

    getChildren(): TreeViewItem[] | Thenable<TreeViewItem[]> {
        throw new Error ("NO CHILDREN");
    }
}

export function sortTreeViewItems(p1: TreeViewItem, p2: TreeViewItem) {
    return p1.label.localeCompare(p2.label);
}

