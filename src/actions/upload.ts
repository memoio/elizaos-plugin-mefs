import { logger } from "@elizaos/core";
import {
    type Action,
    type ActionResult,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import fs from "fs";
import { validateStorageClientConfig } from "../schemes";
import { StorageService } from "../clients/storage";

export const uploadAction: Action = {
    name: "STORAGE_UPLOAD",
    similes: ["UPLOAD", "STORE", "SAVE", "PUT", "PIN"],
    description:
        "Use this action when the user wants to upload a file to MEFS storage.",

    validate: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state: State | undefined
    ): Promise<boolean> => {
        try {
            await validateStorageClientConfig(runtime);
            return true;
        } catch (error: any) {
            logger.error(error, "Storage client config validation failed");
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State | undefined,
        _options: Record<string, unknown> = {},
        callback?: HandlerCallback,
        responses?: Memory[]
    ): Promise<ActionResult> => {
        const attachments = message.content.attachments;
        console.log("responses", responses);
        if (attachments && attachments.length === 0) {
            logger.error("No file to upload.");
            callback?.({
                text: "Looks like you didn't attach any files. Please attach a file and try again.",
                action: null,
            });
            return {
                success: false,
                text: "Looks like you didn't attach any files. Please attach a file and try again.",
                data: {
                    actions: ['STORAGE_UPLOAD'],
                },
                values: {
                    error: "No file to upload",
                },
            };
        }

        if (callback) {
            await callback({
                text: "OK! Uploading file(s) to MEFS...",
                action: null,
            });
        }
        try {
            logger.info("Uploading file(s) to MEFS...");

            const storageService = runtime.getService(
                "storage" as any
            ) as StorageService;
            if (!storageService) {
                logger.error("Storage service not available in runtime");
                await callback?.({
                    text: "I'm sorry, the Storage service is not available. Please try again later.",
                    content: {
                        error: "Storage service not available in runtime",
                    },
                });
                return {
                    success: false,
                    text: "I'm sorry, the Storage service is not available. Please try again later.",
                    data: {
                        actions: ['STORAGE_UPLOAD'],
                    },
                    values: {
                        error: "Storage service not available in runtime",
                    },
                };
            }

            await storageService.initializeStorage();

            const cidResults: string[] = [];
            // 上传 attachments
            for (const attached of attachments || []) {
                try {
                    const fileContent = fs.readFileSync(attached.url);
                    const filename = attached.title || attached.url.split('/').pop() || 'file';

                    const cid = await storageService.uploadFile(
                        fileContent,
                        filename,
                        false // Do not make the file public
                    );

                    cidResults.push(cid);
                    logger.info(`File uploaded with CID: ${cid}`);
                } catch (error: any) {
                    logger.error(error, `Error processing file: ${attached.title || attached.url}`);
                    throw error;
                }
            }

            // Upload text content from responses
            if (responses && responses.length > 0) {
                for (const response of responses) {
                    if (response.content?.text) {
                        try {
                            const textContent = response.content.text;
                            const textBuffer = Buffer.from(textContent, 'utf-8');
                            const filename = `response_${Date.now()}.txt`;

                            const cid = await storageService.uploadFile(
                                textBuffer,
                                filename,
                                false // Do not make the file public
                            );

                            cidResults.push(cid);
                            logger.info(`Response text uploaded with CID: ${cid}`);
                        } catch (error: any) {
                            logger.error(error, `Error processing response text`);
                            throw error;
                        }
                    }
                }
            }

            const cidList = cidResults.join(", ");
            logger.info(`Uploaded ${cidResults.length} file(s) to MEFS. CIDs: ${cidList}`);
            await callback?.({
                text: `File(s) uploaded to MEFS successfully!\n\nFile CIDs:\n${cidResults.map((cid, idx) => `File ${idx + 1}: ${cid}`).join("\n")}`,
                action: null,
            });

            logger.success("File(s) uploaded to MEFS successfully");
            return {
                success: true,
                text: `File(s) uploaded to MEFS successfully!\n\nFile CIDs:\n${cidResults.map((cid, idx) => `File ${idx + 1}: ${cid}`).join("\n")}`,
                data: {
                    actions: ['STORAGE_UPLOAD'],
                },
                values: {
                    cidList: cidList,
                },
            };
        } catch (error: any) {
            logger.error(error, "Error uploading file(s) to MEFS");
            await callback?.({
                text: "Sorry, failed to upload file(s) to MEFS. Please try again later.",
                content: {
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            return {
                success: false,
                text: "Sorry, failed to upload file(s) to MEFS. Please try again later.",
                data: {
                    actions: ['STORAGE_UPLOAD'],
                },
                values: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    },

    examples: [
        [
            {
                name: "{{user1}}",
                content: {
                    text: "can you upload this file?",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you upload this file to local storage.",
                    action: "STORAGE_UPLOAD",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: `File(s) uploaded to local storage successfully!\n\nFile MD5 values: 1f386e7febf642da60bf013d0ecb8469\n}`,
                    action: null,
                },
            },
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "store this document in Storacha please",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you store that document in local storage.",
                    action: "STORAGE_UPLOAD",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: `File(s) uploaded to local storage successfully!\n\nFile MD5 values: 1f386e7febf642da60bf013d0ecb8469\n}`,
                    action: null,
                },
            },
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "save this image for me",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you save that image to local storage.",
                    action: "STORAGE_UPLOAD",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: `File(s) uploaded to local storage successfully!\n\nFile MD5 values: 1f386e7febf642da60bf013d0ecb8469\n}`,
                    action: null,
                },
            },
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "pin this image into IPFS",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you save that image to local storage.",
                    action: "STORAGE_UPLOAD",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: `File(s) uploaded to local storage successfully!\n\nFile MD5 values: 1f386e7febf642da60bf013d0ecb8469\n`,
                    action: null,
                },
            },
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "pin this file into IPFS",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you save that file to local storage.",
                    action: "STORAGE_UPLOAD",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: `File(s) uploaded to local storage successfully!\n\nFile MD5 values: 1f386e7febf642da60bf013d0ecb8469\n}`,
                    action: null,
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
