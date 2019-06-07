import * as request from "request-promise-native";
import { DSSConfiguration } from "../dssConfiguration";

interface Options {
    json?: boolean;
    body?: any;
    method?: string;
    headers?: any;
    resolveWithFullResponse?: boolean;
    encoding?: string | null;
}

export class HttpError extends Error {
    constructor(message: string, public errorCode: number) {
        super(message);
    }
}

export class RequestWrapper {
    static async post<T>(endpoint: string, options?: Options): Promise<T> {
        return this.request<T>("post", endpoint, options);
    }

    static async get<T>(endpoint: string, options?: Options): Promise<T> {
        return this.request<T>("get", endpoint, options);
    }

    static async put<T>(endpoint: string, options?: Options): Promise<T> {
        return this.request<T>("put", endpoint, options);
    }

    static async delete<T>(endpoint: string, options?: Options): Promise<T> {
        return this.request<T>("delete", endpoint, options);
    }

    private static async request<T>(method: string, endpoint: string, options?: Options): Promise<T> {
        if (!options) {
            options = {}; 
        }
        if (options.json === undefined) {
            options.json = true;
        }

        options.method = method;
        options.headers = this.authHeader();
        return new Promise((resolve, reject) => {
            request(this.baseUrl() + endpoint, options)
                .then(resolve)
                .catch((error) => {
                    console.error(error);
                    const statusCode = error.statusCode ? error.statusCode : "";
                    let parsedError: any;
                    if (typeof error.error === "object") {
                        parsedError = error.error;
                    } else {
                        try {
                            parsedError = JSON.parse(error.error);
                        } catch {
                            parsedError = { message: "Error" };
                        }
                    }
                    reject(new HttpError(`Dataiku DSS: ${statusCode} ${parsedError.message}`, Number(statusCode)));
                });
        });
    }

    private static baseUrl(): string {
        let dssUrl = DSSConfiguration.getUrl();
        if (dssUrl.endsWith("/")) {
            dssUrl = dssUrl.substring(0, dssUrl.length - 1);
        }
        return dssUrl + "/public/api/";
    }

    private static authHeader(): any {
        const dssApiKey = DSSConfiguration.getAPIKey();
        const auth = "Basic " + Buffer.from(dssApiKey+":").toString("base64");
        return {
            "Authorization" : auth,
        };
    }
}
