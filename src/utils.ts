import { Memory } from "@elizaos/core";
import { CID } from 'multiformats/cid';

/**
 * Extract CID (Content Identifier) array from message
 * CID formats: Qm... (base58, 46 chars), bafy... (base32, 59+ chars), or other IPFS CID formats
 * @param message - message object
 * @returns CID array
 */
export const getCIDsFromMessage = (message: Memory): string[] => {
    if (!message?.content?.text) {
        return [];
    }

    // Patterns for potential CIDs:
    // - v0 CIDs start with Qm and are 46 characters in base58
    // - v1 CIDs commonly start with b for various base encodings (often bafy, bafk, etc.)
    const cidPattern = /(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{1,})/g;
    const matches = message.content.text.match(cidPattern);
    const cids: string[] = [];

    if (matches) {
        for (const match of matches) {
            try {
                const cid = CID.parse(match);
                // Accept both v0 and v1 CIDs
                if (cid.version === 0 || cid.version === 1) {
                    cids.push(cid.toString());
                }
            } catch (error) {
                // We can ignore this error as it's not a valid CID
            }
        }
    }
    return cids;
};
