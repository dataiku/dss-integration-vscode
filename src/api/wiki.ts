import { VersionTag } from "./versionTag";
import { RequestWrapper } from "./requestWrapper";

export interface Wiki {
    projectKey: string;
    name: string;
    id: string;
    homeArticleId: string;
    taxonomy: WikiTaxonomy[];
}

export interface WikiTaxonomy {
    id: string;
    children: WikiTaxonomy[];
}

export interface WikiArticle {
    article: {
        projectKey: string;
        id: string;
        name: string;
        layout: string;
        tags: string[];
        versionTag: VersionTag;
    }
    payload: string;
}

export interface NewWikiArticle {
    projectKey: string;
    name: string;
    parent?: string;
}

export interface WikiArticleWithTaxonomy {
    article: WikiArticle;
    taxonomy: WikiTaxonomy;
}

export async function getWiki(projectKey: string): Promise<Wiki> {
    const endpoint = "/projects/" + projectKey + "/wiki/";
    return await RequestWrapper.get(endpoint);
}

export async function getWikiArticle(projectKey: string, id: string): Promise<WikiArticle> {
    const endpoint = "/projects/" + projectKey + "/wiki/" + id;
    return await RequestWrapper.get(endpoint);
}

export async function getWikiArticlesWithTaxonomies(projectKey: string, wikiTaxonomies: WikiTaxonomy[]): Promise<WikiArticleWithTaxonomy[]> {
    const wikiArticlesWithTaxonomies: WikiArticleWithTaxonomy[] = [];
    for (const wikiArticleTaxonomy of wikiTaxonomies) {
        wikiArticlesWithTaxonomies.push({
            article: await getWikiArticle(projectKey, wikiArticleTaxonomy.id),
            taxonomy: wikiArticleTaxonomy
        });
    }
    return wikiArticlesWithTaxonomies;
}

export function saveWikiArticle(wikiArticle: WikiArticle): Promise<void> {
    const endpoint = "/projects/" + wikiArticle.article.projectKey + "/wiki/" + wikiArticle.article.id;
    return RequestWrapper.put(endpoint, { body: wikiArticle });
}

export function createWikiArticle(projectKey: string, name: string, parent?: string): Promise<void> {
    const endpoint = "/projects/" + projectKey + "/wiki/"
    const body: NewWikiArticle = {
        projectKey: projectKey,
        name: name
    };
    if (parent)
        body.parent = parent;
    return RequestWrapper.post(endpoint, {body: body})
}

export function deleteWikiArticle(wikiArticle: WikiArticle): Promise<void> {
    const endpoint = "/projects/" + wikiArticle.article.projectKey + "/wiki/" + wikiArticle.article.id;
    return RequestWrapper.delete(endpoint);
}
