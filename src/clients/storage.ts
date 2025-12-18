import { Service, logger, IAgentRuntime } from "@elizaos/core";
import {
    MefsConfig,
    validateStorageClientConfig,
} from "../schemes";

export class StorageService extends Service {
    private mefsConfig: MefsConfig | null = null;
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    protected runtime: IAgentRuntime;
    static serviceType: string = "storage";
    capabilityDescription: string =
        "Manages files in MEFS storage system";

    constructor(runtime: IAgentRuntime) {
        super(runtime);
        this.runtime = runtime;
    }

    async initializeStorage(): Promise<void> {
        try {
            if (this.mefsConfig && this.accessToken) {
                logger.info("Storage client already initialized");
                return;
            }
            if (!this.runtime) {
                throw new Error("Runtime not available");
            }
            logger.info("Storage client initializing...");
            this.mefsConfig = await validateStorageClientConfig(this.runtime);

            // Login to MEFS
            await this.loginToMEFS();

            logger.success(`✅ Storage client successfully started`);
        } catch (error: any) {
            logger.error(error, "❌ Storage client failed to start");
            throw error;
        }
    }

    /**
     * Login to MEFS system
     */
    private async loginToMEFS(): Promise<void> {
        if (!this.mefsConfig) {
            throw new Error("Storage config not initialized");
        }

        try {
            // 1. Get challenge
            const challengeUrl = new URL(this.mefsConfig.MEFS_API_URL + "/challenge");
            challengeUrl.searchParams.set("address", this.mefsConfig.MEFS_WALLET_ADDRESS);
            challengeUrl.searchParams.set("chainid", this.mefsConfig.MEFS_CHAIN_ID.toString());

            const origin = this.mefsConfig.MEFS_ORIGIN || this.mefsConfig.MEFS_API_URL;
            const challengeResponse = await fetch(challengeUrl.toString(), {
                method: "GET",
                headers: {
                    "Origin": origin,
                },
            });

            if (!challengeResponse.ok) {
                const errorText = await challengeResponse.text();
                throw new Error(`Failed to get challenge: ${challengeResponse.status} ${errorText}`);
            }

            const challengeMessage = await challengeResponse.text();
            logger.info("Challenge message received");

            // 2. Sign message
            // Dynamically import ethers
            const ethersModule = await import("ethers");
            const ethers = ethersModule.ethers;
            if (!ethers) {
                throw new Error("ethers module not found. Please install ethers package: npm install ethers");
            }
            const wallet = new ethers.Wallet(this.mefsConfig.MEFS_PRIVATE_KEY);
            const signature = await wallet.signMessage(challengeMessage);
            logger.info("Message signed");

            // 3. Login
            const loginUrl = new URL(this.mefsConfig.MEFS_API_URL + "/login");
            const loginResponse = await fetch(loginUrl.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: challengeMessage,
                    signature: signature,
                }),
            });

            if (!loginResponse.ok) {
                const errorText = await loginResponse.text();
                throw new Error(`Failed to login: ${loginResponse.status} ${errorText}`);
            }

            const loginResult = await loginResponse.json();
            this.accessToken = loginResult.accessToken;
            this.refreshToken = loginResult.refreshToken;
            logger.info("✅ Successfully logged in to MEFS");
        } catch (error: any) {
            logger.error(error, "❌ Failed to login to MEFS");
            throw error;
        }
    }

    /**
     * Get authentication headers
     */
    private getAuthHeaders(): Record<string, string> {
        if (!this.accessToken) {
            throw new Error("Not authenticated. Please initialize storage first.");
        }
        return {
            "Authorization": `Bearer ${this.accessToken}`,
        };
    }

    async stop(): Promise<void> {
        this.mefsConfig = null;
    }

    getConfig() {
        if (!this.mefsConfig) {
            throw new Error("Storage client not initialized");
        }
        return this.mefsConfig;
    }

    /**
     * Upload file to MEFS
     * @param buffer - file content
     * @param filename - file name
     * @param publicFile - whether file is public (default: false)
     * @param key - encryption key (optional, default key will be used if not provided and file is not public)
     * @returns CID (content identifier)
     */
    async uploadFile(
        buffer: Buffer,
        filename: string,
        publicFile: boolean = false,
        key?: string
    ): Promise<string> {
        if (!this.mefsConfig) {
            throw new Error("Storage config not initialized");
        }
        if (!this.accessToken) {
            await this.loginToMEFS();
        }

        try {
            const uploadUrl = new URL(this.mefsConfig.MEFS_API_URL + "/mefs/");

            // Use FormData (Node.js 18+ supports global FormData)
            let FormDataClass: any;
            let isGlobalFormData = false;
            try {
                FormDataClass = (globalThis as any).FormData;
                if (FormDataClass) {
                    isGlobalFormData = true;
                } else {
                    // Try using the form-data package
                    FormDataClass = require("form-data");
                }
            } catch {
                throw new Error("FormData is not available. Please install 'form-data' package or use Node.js 18+");
            }

            const formData = new FormDataClass();

            // Handle different FormData implementations
            if (isGlobalFormData) {
                // Node.js 18+ global FormData expects Blob
                const BlobClass = (globalThis as any).Blob || require("buffer").Blob;
                const blob = new BlobClass([buffer], { type: "application/octet-stream" });
                formData.append("file", blob, filename);
            } else {
                // form-data package accepts Buffer directly
                formData.append("file", buffer, filename);
            }

            if (publicFile) {
                formData.append("public", "true");
            } else if (key) {
                formData.append("key", key);
            }

            const headers = this.getAuthHeaders();

            // For form-data package, we need to get headers from formData
            let finalHeaders: Record<string, string> = { ...headers };
            if (!isGlobalFormData && formData.getHeaders) {
                // form-data package provides getHeaders() method
                const formHeaders = formData.getHeaders();
                finalHeaders = { ...headers, ...formHeaders };
            }

            const response = await fetch(uploadUrl.toString(), {
                method: "POST",
                headers: finalHeaders,
                body: formData as any,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            logger.info(`File uploaded successfully. CID: ${result.Mid}`);
            return result.Mid;
        } catch (error: any) {
            logger.error(error, "Failed to upload file to MEFS");
            throw error;
        }
    }

    /**
     * Retrieve file from MEFS
     * @param cid - content identifier
     * @param key - decryption key (optional, required for encrypted files)
     * @returns file buffer
     */
    async retrieveFile(cid: string, key?: string): Promise<Buffer> {
        if (!this.mefsConfig) {
            throw new Error("Storage config not initialized");
        }
        if (!this.accessToken) {
            await this.loginToMEFS();
        }

        try {
            const retrieveUrl = new URL(this.mefsConfig.MEFS_API_URL + "/mefs/" + cid);

            // According to the documentation, the key can be passed via query string or POST body
            // Here we use the query string method
            if (key) {
                retrieveUrl.searchParams.set("key", key);
            }

            const response = await fetch(retrieveUrl.toString(), {
                method: "GET",
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to retrieve file: ${response.status} ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            logger.info(`File retrieved successfully. CID: ${cid}, Size: ${buffer.length} bytes`);
            return buffer;
        } catch (error: any) {
            logger.error(error, "Failed to retrieve file from MEFS");
            throw error;
        }
    }

    static async start(runtime: IAgentRuntime): Promise<StorageService> {
        const storageService = new StorageService(runtime);
        await storageService.initializeStorage();
        return storageService;
    }

    static async stop(_runtime: IAgentRuntime): Promise<void> {
        // No global cleanup needed
    }
}

// For backward compatibility, create an alias
export class StorageClientInstanceImpl extends StorageService { }
export const StorageClientInterface = StorageService;
