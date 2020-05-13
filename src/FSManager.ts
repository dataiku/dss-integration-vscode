import { WebApp, WebAppType, BokehWebAppParams, ShinyWebAppParams, StandardWebAppParams, WebAppFile } from "./api/webapp";
import { RecipeAndPayload } from "./api/recipe";
import { WikiArticle } from "./api/wiki";
import { writeFile, existsSync, mkdirSync, rmdirSync, readdirSync, lstatSync, unlinkSync } from "fs";
import * as path from "path";
import { dssLanguageIdToFileType } from "./utils";


export class FileDetails {
    name: string;
    content: string | Buffer;
    path: string;

    constructor(name: string, content: string | Buffer, path: string) {
        this.name = name;
        this.content = content;
        this.path = path;
    }

    static fromPlugin(pluginId: string, filePath: string, content?: string | Buffer): FileDetails {
        const pluginPath = filePath.substr(0, filePath.lastIndexOf('/'));
        const fileName = filePath.substr(filePath.lastIndexOf('/') + 1);
        let directory = "PLUGINS/" + pluginId;
        if (pluginPath !== "") {
            directory += "/" + pluginPath;
        }
        if (content === undefined) {
            content = "";
        }
        return new FileDetails(fileName, content, directory);
    }

    static fromWebApp(webApp: WebApp): FileDetails[] {
        const files: FileDetails[]  = [];
        const dir = webApp.projectKey + "/WEBAPPS/" + webApp.name;

        if (webApp.type === WebAppType.BOKEH) {
            const params = webApp.params as BokehWebAppParams;
            files.push(
                new FileDetails(WebAppFile.BACKEND, params.python, dir)
            );
        } else if (webApp.type === WebAppType.SHINY) {
            const params = webApp.params as ShinyWebAppParams;
            files.push(
                new FileDetails(WebAppFile.SERVER, params.server, dir),
                new FileDetails(WebAppFile.UI, params.ui, dir),
            );
        } else if (webApp.type === WebAppType.STANDARD) {
            const params = webApp.params as StandardWebAppParams;
            files.push(
                new FileDetails(WebAppFile.HTML, params.html, dir),
                new FileDetails(WebAppFile.CSS, params.css, dir),
                new FileDetails(WebAppFile.JS, params.js, dir),
            );
            if (params.backendEnabled) {
                files.push(new FileDetails(WebAppFile.BACKEND, params.python, dir));
            }
        }
        return files;
    }

    static fromRecipe(recipeAndPayload: RecipeAndPayload): FileDetails {
        const language = recipeAndPayload.recipe.type;
        const extension = dssLanguageIdToFileType[language];
        const content = recipeAndPayload.payload;
        const fileName = recipeAndPayload.recipe.name + "." + extension;
        const dir = recipeAndPayload.recipe.projectKey + "/" + "RECIPES";
        return new FileDetails(fileName, content, dir);
    }

    static fromWikiArticle(wikiArticle: WikiArticle): FileDetails {
        const fileName = wikiArticle.article.name.replace(/[^a-z0-9]/gi, '_') + '.md';
        const content = wikiArticle.payload;
        const dir = wikiArticle.article.projectKey + "/" + "WIKI";
        return new FileDetails(fileName, content, dir);
    }
}
export class FSManager {
    constructor(private storagePath: string) {

    }
    saveInFS(file: FileDetails): Thenable<string> {
        const fullPathDirectory = this.storagePath + "/" + file.path;
        const fullPathFile = fullPathDirectory + "/" + file.name;
        this.recursivelyCreateFolder(fullPathDirectory);
        
        return new Promise<string>((resolve, reject) => {
            writeFile(fullPathFile, file.content,  function(err: any) {
                if (err) {
                    reject(err);
                }
                resolve(fullPathFile);
            });
        });
    }

    cleanFS() {
        this.recursivelyCleanDirecoty(this.storagePath);
    }

    private recursivelyCleanDirecoty(directoryPath: string) {
        if (existsSync(directoryPath)) {
            for (const entry of readdirSync(directoryPath)) {
                var entryPath = path.join(directoryPath, entry);
                if (lstatSync(entryPath).isDirectory()) {
                    this.recursivelyCleanDirecoty(entryPath);
                } else {
                    unlinkSync(entryPath);
                }
            }
            rmdirSync(directoryPath);
        }
    }

    private recursivelyCreateFolder(directory: string): string {
        const directoryToCreate = path.resolve(directory);
        const directoryInfo = path.parse(directoryToCreate);
        if (!existsSync(directoryToCreate)) {
            if (directoryInfo.base === '') {
                throw new Error("Unable to create directory " + directory + ": Root directory does not exist.");
            }
            this.recursivelyCreateFolder(directoryInfo.dir);
            mkdirSync(directoryToCreate);
        }
        return directoryToCreate;
    }
}


