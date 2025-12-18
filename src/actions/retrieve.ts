import {
    type Action,
    type ActionResult,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    logger,
} from "@elizaos/core";
import { StorageService } from "../clients/storage";
import { getCIDsFromMessage } from "../utils";

export const retrieveAction: Action = {
    name: "STORAGE_RETRIEVE",
    similes: [
        "RETRIEVE",
        "RETRIEVE_FILE",
        "RETRIEVE_FILE_FROM_STORAGE",
        "RETRIEVE_FILE_FROM_IPFS",
        "GET",
        "GET_FILE",
        "GET_FILE_FROM_STORAGE",
        "GET_FILE_FROM_IPFS",
        "GET_FILE_FROM_CID",
        "LOAD",
        "LOAD_FILE",
        "LOAD_FILE_FROM_STORAGE",
        "LOAD_FILE_FROM_IPFS",
        "LOAD_FILE_FROM_CID",
        "READ",
        "READ_FILE",
        "READ_FILE_FROM_STORAGE",
        "READ_FILE_FROM_IPFS",
        "READ_FILE_FROM_CID",
    ],
    description:
        "Retrieve a file from MEFS storage. Use this action when a user asks you to retrieve a file from MEFS storage based on a CID (Content Identifier).",

    validate: async (runtime: IAgentRuntime,
        _message: Memory,
        _state: State | undefined): Promise<boolean> => {
        logger.log("Starting STORAGE_RETRIEVE validate...");
        // Check if storage service is available
        const storageService = runtime.getService("storage" as any);
        return !!storageService;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State | undefined,
        _options: Record<string, unknown> = {},
        callback?: HandlerCallback,
        responses?: Memory[]
    ): Promise<ActionResult> => {
        logger.log("Starting STORAGE_RETRIEVE handler...");
        const cids = getCIDsFromMessage(message);
        if (cids.length === 0) {
            await callback?.({
                text: "You didn't provide any CID values to retrieve files.",
            });
            return {
                success: false,
                text: "You didn't provide any CID values to retrieve files.",
                data: {
                    actions: ['STORAGE_RETRIEVE'],
                },
                values: {
                    error: "No CID values provided",
                },
            };
        }

        try {
            logger.log("Retrieving file(s) from MEFS...");

            // Get the storage service from runtime
            const storageService = runtime.getService(
                "storage" as any
            ) as StorageService;
            if (!storageService) {
                await callback?.({
                    text: "Storage service is not available in runtime.",
                });
                return {
                    success: false,
                    text: "Storage service is not available in runtime.",
                    data: {
                        actions: ['STORAGE_RETRIEVE'],
                    },
                    values: {
                        error: "Storage service not available in runtime",
                    },
                };
            }

            // 确保存储服务已初始化
            await storageService.initializeStorage();

            const retrievedFiles: Array<{ cid: string; content: string; size: number }> = [];
            const notFoundFiles: string[] = [];

            for (const cid of cids) {
                try {
                    const fileBuffer = await storageService.retrieveFile(cid);

                    // 尝试将文件内容转换为文本
                    let fileContent: string;
                    try {
                        // 尝试作为 UTF-8 文本解码
                        fileContent = fileBuffer.toString('utf-8');
                        // 检查是否包含不可打印字符（可能是二进制文件）
                        if (/[\x00-\x08\x0E-\x1F]/.test(fileContent) && fileBuffer.length > 0) {
                            // 如果是二进制文件，显示为 base64 或十六进制
                            fileContent = `[Binary file, size: ${fileBuffer.length} bytes]\nBase64: ${fileBuffer.toString('base64')}`;
                        }
                    } catch (error) {
                        // 如果解码失败，显示为 base64
                        fileContent = `[Binary file, size: ${fileBuffer.length} bytes]\nBase64: ${fileBuffer.toString('base64')}`;
                    }

                    retrievedFiles.push({
                        cid,
                        content: fileContent,
                        size: fileBuffer.length
                    });

                    logger.info(`File retrieved successfully. CID: ${cid}, Size: ${fileBuffer.length} bytes`);
                } catch (error: any) {
                    logger.error(error, `Failed to retrieve file with CID: ${cid}`);
                    notFoundFiles.push(cid);
                }
            }

            if (retrievedFiles.length === 0) {
                await callback?.({
                    text: `No files found for the given CIDs: \n${notFoundFiles.join("\n")}`,
                });
                return {
                    success: false,
                    text: `No files found for the given CIDs: \n${notFoundFiles.join("\n")}`,
                    data: {
                        actions: ['STORAGE_RETRIEVE'],
                    },
                    values: {
                        error: "No files found for the given CIDs",
                    },
                };
            }

            // 构建响应消息，直接包含文件内容
            let responseText = `Retrieved ${retrievedFiles.length} file(s) from MEFS:\n\n`;
            retrievedFiles.forEach((file, idx) => {
                responseText += `=== File ${idx + 1} (CID: ${file.cid}, Size: ${file.size} bytes) ===\n`;
                responseText += `${file.content}\n\n`;
            });

            if (notFoundFiles.length > 0) {
                responseText += `\nFailed to retrieve files for the following CIDs: \n${notFoundFiles.join("\n")}`;
            }

            await callback?.({
                text: responseText,
            });
            logger.log("File(s) retrieved successfully!");
            return {
                success: true,
                text: responseText,
                data: {
                    actions: ['STORAGE_RETRIEVE'],
                },
                values: {
                    retrievedFiles: retrievedFiles,
                },
            };
        } catch (error: any) {
            logger.error(error, "Error during retrieve file(s) from MEFS");
            await callback?.({
                text: `Error during retrieve file(s) from MEFS: ${error instanceof Error ? error.message : String(error)}`,
            });
            return {
                success: false,
                text: `Error during retrieve file(s) from MEFS: ${error instanceof Error ? error.message : String(error)}`,
                data: {
                    actions: ['STORAGE_RETRIEVE'],
                },
                values: {
                    error: "Error during retrieve file(s) from MEFS",
                },
            }
        }
    },

    examples: [
        [
            {
                name: "{{user1}}",
                content: {
                    text: "Fetch the file QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you retrieve the file. Please wait...",
                },
            },
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "Get the file QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
                },
            },
            {
                name: "{{agent}}",
                content: {
                    text: "I'll help you retrieve the file. Please wait...",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
