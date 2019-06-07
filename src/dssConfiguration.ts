import * as vscode from "vscode";
import { homedir } from "os";
import * as fs from 'fs';

class LocalConfig {
    dss_instances: {[key: string]:
        {   
            url: string
            api_key: string
            no_check_certificate: boolean;
        },
    };
    default_instance: string;

    constructor() {
        this.dss_instances =  {
            default: {
                url: "",
                api_key: "",
                no_check_certificate: false
            }
        };
        this.default_instance = "default";
    }

    getDefaultConfig() {
        const defaultConfig = this.dss_instances[this.default_instance];
        if (defaultConfig) {
            return defaultConfig;
        } else {
            throw new Error(DSSConfiguration.MALFORMED_CONFIG_FILE_ERR);
        }
    }

    get(key: "url" | "api_key"): string {
        if (key === "url") {
            return this.getUrl();
        } else if (key === "api_key"){
            return this.getApiKey();
        }  else {
            throw new Error("Dataiku DSS: Should not happend");
        }
    }

    getUrl(): string {
        const url = this.getDefaultConfig().url;
        if (url === undefined) {
            throw new Error(DSSConfiguration.MALFORMED_CONFIG_FILE_ERR);
        }
        return url;
    }

    getApiKey(): string {
        const apiKey = this.getDefaultConfig().api_key;
        if (apiKey === undefined) {
            throw new Error(DSSConfiguration.MALFORMED_CONFIG_FILE_ERR);
        }
        return apiKey;
    }
}

export class DSSConfiguration {
    private static readonly CONFIG_FILE_PATH = homedir() + "/.dataiku/config.json";
    
    static readonly MALFORMED_CONFIG_FILE_ERR = "Dataiku DSS: Malformed config file " + DSSConfiguration.CONFIG_FILE_PATH;
    static readonly NO_URL_ERR = "Dataiku DSS: No URL has been setup.";
    static readonly NO_API_KEY_ERR = "Dataiku DSS: No API key has been setup.";

    static getUrl(): string {
        const fromFile = this.getConfigFromFS();
        if (fromFile) {
            const url = fromFile.getUrl();
            if (url) {
                return url;
            }
        }

        const fromEnvVar = this.getURLFromEnvVar();
        if (fromEnvVar) {
            return fromEnvVar;
        }

        throw new Error(DSSConfiguration.NO_URL_ERR);
    }

    static getAPIKey() {
        const fromFile = this.getConfigFromFS();
        if (fromFile) {
            const apiKey = fromFile.getApiKey();
            if (apiKey) {
                return apiKey;
            }
        }

        const fromEnvVar = this.getApiKeyFromEnvVar();
        if (fromEnvVar) {
            return fromEnvVar;
        }
        throw new Error(DSSConfiguration.NO_API_KEY_ERR);
    }

    static async setUrlFromUserInut(): Promise<void> {
        await DSSConfiguration.modifyConfigFromUserInput("url", "Enter the URL of the DSS instance");
    }

    static async setApiKeyFromUserInput(): Promise<void> {
        await DSSConfiguration.modifyConfigFromUserInput("api_key", "Enter your API key");
    }

    static setCheckCertificate(active: boolean): void {
        let currentConfig = DSSConfiguration.getConfigFromFS();
        if (! currentConfig) {
            currentConfig = new LocalConfig(); 
        }
        currentConfig.getDefaultConfig()["no_check_certificate"] = !active;
        DSSConfiguration.saveConfig(currentConfig);
    }

    private static async modifyConfigFromUserInput(configKey: "url" | "api_key", prompt: string) {
        const currentConfig = DSSConfiguration.getConfigFromFS();
        let newConfig: LocalConfig;
        let placeHolder = "";
        if (currentConfig) {
            const currentValue = currentConfig.get(configKey);
            placeHolder = `current for ${currentConfig.default_instance} instance: ${currentValue}`;
            newConfig = currentConfig;
        } else {
            newConfig = new LocalConfig();
        }
        let newValue = await vscode.window.showInputBox({ placeHolder, prompt, ignoreFocusOut: true });
        if (newValue) {
            newConfig.getDefaultConfig()[configKey] = newValue;
            await DSSConfiguration.saveConfig(newConfig);
            
            if (newConfig.getUrl() && newConfig.getApiKey())  {
                vscode.commands.executeCommand("dssPlugins.refreshEntry");
                vscode.commands.executeCommand("dssProjects.refreshEntry");
            }
        }
    }

    private static getConfigFromFS(): LocalConfig | undefined {
        const configFilePath = DSSConfiguration.CONFIG_FILE_PATH;
        if (fs.existsSync(configFilePath)) {
            try {
                const buffer = fs.readFileSync(configFilePath);
                const fromFile = JSON.parse(buffer.toString());
                const localConfig = new LocalConfig();
                localConfig.default_instance = fromFile.default_instance;
                localConfig.dss_instances = fromFile.dss_instances;
                return localConfig;
            } catch {
                throw new Error(DSSConfiguration.MALFORMED_CONFIG_FILE_ERR);
            }
        }
    }

    private static async saveConfig(config: LocalConfig): Promise<void> {
        const dir = homedir() + "/.dataiku";
        if (! fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        fs.writeFileSync(DSSConfiguration.CONFIG_FILE_PATH,  JSON.stringify(config, null, 4));
    }

    private static getURLFromEnvVar(): string | undefined {
        return process.env.DKU_DSS_URL;
    }

    private static getApiKeyFromEnvVar(): string | undefined {
        return process.env.DKU_API_KEY;
    }

}