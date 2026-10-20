import * as assert from "assert";
import { window } from "vscode";
import { RecipeAndPayload } from "../api/recipe";
import { RequestWrapper } from "../api/requestWrapper";
import { VersionTag } from "../api/versionTag";
import { WebApp, WebAppType } from "../api/webapp";
import { WikiArticle } from "../api/wiki";
import { FSManager } from "../FSManager";
import { RecipeRemoteSaver, WebAppRemoteSaver, WikiArticleRemoteSaver } from "../remoteSaver";

function versionTag(versionNumber: number, login: string = "alice"): VersionTag {
    return { versionNumber, lastModifiedBy: { login }, lastModifiedOn: Date.now() };
}

function recipeAndPayload(tag: VersionTag | null): RecipeAndPayload {
    return {
        recipe: {
            type: "python",
            name: "compute_output",
            projectKey: "TEST",
            outputs: { main: { items: [{ ref: "output" }] } },
            versionTag: tag
        },
        payload: "# local changes"
    };
}

function webApp(tag: VersionTag | null): WebApp {
    return {
        type: WebAppType.BOKEH,
        projectKey: "TEST",
        name: "test_webapp",
        id: "webapp",
        params: { python: "# local changes" },
        versionTag: tag
    };
}

function wikiArticle(tag: VersionTag | null): WikiArticle {
    return {
        article: {
            projectKey: "TEST",
            id: "article",
            name: "Test article",
            layout: "SINGLE_COLUMN",
            tags: [],
            versionTag: tag
        },
        payload: "# local changes"
    };
}

function saveHandler<T>(name: string, createObject: (tag: VersionTag | null) => T, saver: { save(item: T): Promise<void> }) {
    return { name, createObject, save: (tag: VersionTag | null) => saver.save(createObject(tag)) };
}

suite("Versioned remote savers", function () {
    const originalGet = RequestWrapper.get;
    const originalPut = RequestWrapper.put;
    const originalShowErrorMessage = window.showErrorMessage;
    const originalShowInformationMessage = window.showInformationMessage;
    let remoteObject: unknown;
    let savedObjects: unknown[];
    let conflictMessages: string[];
    const fsManager = new FSManager("");
    const handlers = [
        saveHandler("recipe", recipeAndPayload, new RecipeRemoteSaver(fsManager)),
        saveHandler("webapp", webApp, new WebAppRemoteSaver(fsManager)),
        saveHandler("wiki article", wikiArticle, new WikiArticleRemoteSaver(fsManager))
    ];

    setup(function () {
        RequestWrapper.get = async <T>(): Promise<T> => remoteObject as T;
        RequestWrapper.put = async (_endpoint: string, options?: { body?: any }): Promise<any> => {
            savedObjects.push(options!.body);
        };
        window.showErrorMessage = (async (message: string) => {
            conflictMessages.push(message);
            return undefined;
        }) as typeof window.showErrorMessage;
        window.showInformationMessage = (async () => undefined) as typeof window.showInformationMessage;
    });

    teardown(function () {
        RequestWrapper.get = originalGet;
        RequestWrapper.put = originalPut;
        window.showErrorMessage = originalShowErrorMessage;
        window.showInformationMessage = originalShowInformationMessage;
    });

    const cases: Array<{
        name: string;
        local: VersionTag | null;
        remote: VersionTag | null;
        matches: boolean;
    }> = [
        { name: "saves when both tags are null", local: null, remote: null, matches: true },
        { name: "prompts when only the local tag is null", local: null, remote: versionTag(0), matches: false },
        { name: "prompts safely when only the remote tag is null", local: versionTag(0), remote: null, matches: false },
        { name: "saves matching version numbers", local: versionTag(7), remote: versionTag(7, "bob"), matches: true },
        { name: "prompts for different version numbers", local: versionTag(7), remote: versionTag(8), matches: false }
    ];

    cases.forEach(testCase => {
        test(testCase.name, async function () {
            for (const handler of handlers) {
                savedObjects = [];
                conflictMessages = [];
                remoteObject = handler.createObject(testCase.remote);
                if (testCase.matches) {
                    await handler.save(testCase.local);
                    assert.deepStrictEqual(savedObjects, [handler.createObject(testCase.local)], handler.name);
                    assert.strictEqual(conflictMessages.length, 0, handler.name);
                } else {
                    await assert.rejects(handler.save(testCase.local), /Save cancelled/, handler.name);
                    assert.strictEqual(savedObjects.length, 0, handler.name);
                    assert.strictEqual(conflictMessages.length, 1, handler.name);
                    if (testCase.remote) {
                        assert.ok(conflictMessages[0].includes("modified about"), handler.name);
                        assert.ok(conflictMessages[0].includes("by " + testCase.remote.lastModifiedBy.login), handler.name);
                    } else {
                        assert.strictEqual(conflictMessages[0], "This " + handler.name + " is being edited by more than one user.\n", handler.name);
                    }
                }
            }
        });
    });
});
