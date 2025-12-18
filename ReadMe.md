# elizaos-plugin-mefs

elizaos-plugin-mefs is a plugin designed to provide decentralized storage functionality for elizaos agents. This plugin allows agents to interact with MEFS, a decentralized storage network, providing file upload and retrieval capabilities.

## Installation

1. Install via bun

```bash
bun install @elizaos/plugin-mefs
```

2. Install via elizaos cli

```bash
elizaos plugins add @elizaos/plugin-mefs
```

## Configuration

1. Add the plugin to your elizaos agent character:

   ```js
   // agent/src/character.ts
   
   export const character: Character = {
     name: 'Eliza',
     plugins: [
       '@elizaos/plugin-mefs',
     ],
     ...
   };
   ```

2. Set environment variables by adding the following to your .env file:

   ```
   MEFS_PRIVATE_KEY=<YOUR-PRIVATE-KEY>
   ```

   Replace YOUR-PRIVATE-KEY with your EVM private key. You can use EVM wallets such as [MetaMask](https://metamask.io/) or [Okx Wallet](https://web3.okx.com/) to create a wallet and obtain your private key.

## Build And Run

Build and start the project from the project root directory

```bash
elizaos start
```

You can now open [http://localhost:3000](http://localhost:3000/) in your browser to access your dedicated AI agent

## Actions

### STORAGE_UPLOAD

Use this action when users want to upload files or AI agent-generated responses to the Storacha decentralized storage network.

**Aliases**

- `UPLOAD`
- `STORE`
- `SAVE`
- `PUT`
- `PIN`

### STORAGE_RETRIEVE

Use this action when users request you to retrieve files from the Storacha network based on CID.

**Aliases**

- `RETRIEVE`
- `RETRIEVE_FILE`
- `RETRIEVE_FILE_FROM_STORAGE`
- `RETRIEVE_FILE_FROM_IPFS`
- `GET`
- `GET_FILE`
- `GET_FILE_FROM_STORAGE`
- `GET_FILE_FROM_IPFS`
- `GET_FILE_FROM_CID`
- `LOAD`
- `LOAD_FILE`
- `LOAD_FILE_FROM_STORAGE`
- `LOAD_FILE_FROM_IPFS`
- `LOAD_FILE_FROM_CID`
- `READ`
- `READ_FILE`
- `READ_FILE_FROM_STORAGE`
- `READ_FILE_FROM_IPFS`
- `READ_FILE_FROM_CID`
