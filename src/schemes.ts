import { IAgentRuntime, logger } from "@elizaos/core";
import { z, ZodIssue } from "zod";
import { ethers } from "ethers";

export const storageClientEnvSchema = z.object({
    MEFS_API_URL: z
        .string()
        .url()
        .default("https://api.mefs.io:10000/produce")
        .describe("MEFS API base URL (e.g., https://api.example.com)"),
    MEFS_PRIVATE_KEY: z
        .string()
        .regex(/^[a-fA-F0-9]{64}$/)
        .describe("Private key for signing challenge messages"),
    MEFS_CHAIN_ID: z
        .number()
        .int()
        .default(985)
        .describe("Chain ID for MEFS authentication (default: 985)"),
    MEFS_ORIGIN: z
        .string()
        .url()
        .default("https://memo.io")
        .describe("Origin URL for challenge request (default: https://memo.io)"),
});

// type StorageClientConfig = z.infer<typeof storageClientEnvSchema>;

export type MefsConfig = {
    MEFS_API_URL: string;
    MEFS_WALLET_ADDRESS: string;
    MEFS_PRIVATE_KEY: string;
    MEFS_CHAIN_ID: number;
    MEFS_ORIGIN: string;
}

export async function validateStorageClientConfig(
    runtime: IAgentRuntime
): Promise<MefsConfig> {
    try {
        const chainIdStr = runtime.getSetting("MEFS_CHAIN_ID");
        const config = {
            MEFS_API_URL: runtime.getSetting("MEFS_API_URL") || "https://api.mefs.io:10000/produce",
            MEFS_PRIVATE_KEY: runtime.getSetting("MEFS_PRIVATE_KEY"),
            MEFS_CHAIN_ID: chainIdStr ? parseInt(chainIdStr, 10) : 985,
            MEFS_ORIGIN: runtime.getSetting("MEFS_ORIGIN") || "https://memo.io",
        };
        const c = storageClientEnvSchema.parse(config);

        let address: string = "";
        if (c.MEFS_PRIVATE_KEY) {
            try {
                address = privateKeyToAddress(c.MEFS_PRIVATE_KEY);
            } catch (error) {
                throw new Error(`Failed to convert private key to address: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return {
            MEFS_API_URL: c.MEFS_API_URL,
            MEFS_WALLET_ADDRESS: address,
            MEFS_PRIVATE_KEY: c.MEFS_PRIVATE_KEY,
            MEFS_CHAIN_ID: c.MEFS_CHAIN_ID,
            MEFS_ORIGIN: c.MEFS_ORIGIN,
        };
    } catch (error: any) {
        logger.error(error, "Storage client config validation failed");
        if (error instanceof z.ZodError) {
            const errorMessages = error.issues
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Storage client configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}

/**
 * Convert ECDSA hex private key to Ethereum address
 * @param privateKeyHex - Hex string of the private key (with or without 0x prefix)
 * @returns Ethereum address (0x-prefixed hex string)
 */
export function privateKeyToAddress(privateKeyHex: string): string {
    if (!privateKeyHex) {
        throw new Error('Private key cannot be empty');
    }

    // Remove 0x prefix if present
    const cleanKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;

    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
        throw new Error('Invalid hex format for private key');
    }

    try {
        // Create wallet from private key
        const wallet = new ethers.Wallet(`0x${cleanKey}`);
        return wallet.address;
    } catch (error) {
        throw new Error(`Failed to convert private key to address: ${error instanceof Error ? error.message : String(error)}`);
    }
}