import { z } from 'zod';

import {
  type IAgentRuntime,
  type Plugin,
  EventType,
  MessagePayload,
  WorldPayload,
  logger
} from "@elizaos/core";
import { uploadAction, retrieveAction } from "./actions";
import { storageClientEnvSchema } from "./schemes.ts";
import {
  StorageService,
} from "./clients/storage.ts";
export { StorageService } from "./clients/storage.ts";

export const storagePlugin: Plugin = {
  name: 'plugin-storage',
  description: 'Plugin to manage files in MEFS storage',
  config: {
    MEFS_API_URL: process.env.MEFS_API_URL || "https://api.mefs.io:10000/produce",
    MEFS_PRIVATE_KEY: process.env.MEFS_PRIVATE_KEY,
    MEFS_CHAIN_ID: process.env.MEFS_CHAIN_ID || 985,
    MEFS_ORIGIN: process.env.MEFS_ORIGIN || "https://memo.io",
  },
  async init(config: Record<string, string>) {
    logger.info('Initializing plugin-storage');
    try {
      const validatedConfig = await storageClientEnvSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined && value !== null) {
          process.env[key] = String(value);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages =
          error.issues?.map((e) => e.message)?.join(', ') || 'Unknown validation error';
        throw new Error(`Invalid plugin configuration: ${errorMessages}`);
      }
      throw new Error(
        `Invalid plugin configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  // models: {
  //   [ModelType.TEXT_SMALL]: async (
  //     _runtime,
  //     { prompt, stopSequences = [] }: GenerateTextParams
  //   ) => {
  //     return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
  //   },
  //   [ModelType.TEXT_LARGE]: async (
  //     _runtime,
  //     {
  //       prompt,
  //       stopSequences = [],
  //       maxTokens = 8192,
  //       temperature = 0.7,
  //       frequencyPenalty = 0.7,
  //       presencePenalty = 0.7,
  //     }: GenerateTextParams
  //   ) => {
  //     return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
  //   },
  // },
  routes: [
    {
      name: 'api-status',
      path: '/api/status',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        res.json({
          status: 'ok',
          plugin: 'quick-starter',
          timestamp: new Date().toISOString(),
        });
      },
    },
  ],
  events: {
    [EventType.MESSAGE_RECEIVED]: [
      async (params: MessagePayload) => {
        logger.debug('MESSAGE_RECEIVED event received');
        logger.debug({ message: params.message }, 'Message:');
      },
    ],
    [EventType.VOICE_MESSAGE_RECEIVED]: [
      async (params: MessagePayload) => {
        logger.debug('VOICE_MESSAGE_RECEIVED event received');
        logger.debug({ message: params.message }, 'Message:');
      },
    ],
    [EventType.WORLD_CONNECTED]: [
      async (params: WorldPayload) => {
        logger.debug('WORLD_CONNECTED event received');
        logger.debug({ world: params.world }, 'World:');
      },
    ],
    [EventType.WORLD_JOINED]: [
      async (params: WorldPayload) => {
        logger.debug('WORLD_JOINED event received');
        logger.debug({ world: params.world }, 'World:');
      },
    ],
  },
  services: [StorageService],
  actions: [uploadAction, retrieveAction],
  // providers: [quickProvider],
  // dependencies: ['@elizaos/plugin-knowledge'], <--- plugin dependencies go here (if requires another plugin)
};

export default storagePlugin;
