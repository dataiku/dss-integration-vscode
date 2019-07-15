import * as request from "request-promise-native";
import { createHash, randomBytes } from "crypto";
import { stringify } from "querystring";
import { type as osType } from "os";

import { DSSConfiguration } from "../dssConfiguration";
import { version } from "../../package.json";
import { EventType } from "./eventType";

export class WT1 {
    private sessionId: string;
    private osType: string;
    private extensionVersion: string;
    private vsCodeVersion: string;
    private readonly TRACKER_URL = "http://tracker.dataiku.com/public/events";
    private readonly EVENT_NAME_PREFIX = "vscode-";

    constructor(vsCodeVersion: string) {
        this.sessionId = this.generateRandomSessionId();
        this.osType = osType();
        this.extensionVersion = version;
        this.vsCodeVersion = vsCodeVersion;
    }

    event(eventType: EventType, params?: any) {
        if (!params) {
            params = {};
        }
        params.type = this.EVENT_NAME_PREFIX + eventType;

        const event: WT1Event = {
            sessionId: this.sessionId,
            visitorId: this.getVisitorId(),
            sparams: stringify({
                os: this.osType, 
                extensionVersion: this.extensionVersion,
                vsCodeVersion: this.vsCodeVersion,
            }),
            clientLang: process.env.LANG,
            events: [{
                type: "event",
                clientTS: new Date().getTime(),
                params: stringify(params),
            }]
       };
       this.sendEvent(event);
    }

    private generateRandomSessionId(): string {
        return randomBytes(64).toString('base64');
    }

    private getVisitorId(): string {
        const apiKey = DSSConfiguration.getAPIKey();
        return createHash("sha256").update(apiKey).digest('hex');
    }
 
    private sendEvent(event: WT1Event): void {
        request.post(this.TRACKER_URL, { body: event, json: true })
        .catch((err) => {
            console.error(`An error occurred while trying to notify tracker service. ${err}`);
        });
    }
}

export interface WT1Event {
    visitorId: string;
    sessionId: string;
    sparams: string;
    clientLang?: string;
    events: Array<
        {
            type : "event" | "page";
            clientTS : number;
            params: string;
        }>;
}
