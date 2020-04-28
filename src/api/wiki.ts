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


export interface WikiArticleWithTaxonomy {
    article: WikiArticle;
    taxonomy: WikiTaxonomy;
}

export function getWiki(projectKey: string): Promise<Wiki> {
    const endpoint = "/projects/" + projectKey + "/wiki/";
    return RequestWrapper.get(endpoint);
}

export function getWikiArticle(projectKey: string, id: string): Promise<WikiArticle> {
    const endpoint = "/projects/" + projectKey + "/wiki/" + id;
    return RequestWrapper.get(endpoint);
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
