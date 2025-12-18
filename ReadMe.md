# elizaos-plugin-mefs

elizaos-plugin-mefs是一款专为elizaos代理提供去中心化存储功能的插件。该插件允许代理和去中心化存储网络——MEFS进行交互，提供文件上传和检索的功能。

## 安装

1. 通过bun进行安装

```bash
bun install @elizaos/plugin-mefs
```

2. 通过elizaos cli进行安装

```bash
elizaos plugins add @elizaos/plugin-mefs
```

## 配置

1. 将插件添加到elizaos代理角色中：

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

2. 设置环境变量，将下面的环境变量添加到.env文件中：

   ```
   MEFS_PRIVATE_KEY=<YOUR-PRIVATE-KEY>
   ```

   将YOUR-PRIVATE-KEY替换为您的EVM私钥。您可以使用[MetaMask](https://metamask.io/)，[Okx Wallet](https://web3.okx.com/)等EVM钱包创建钱包，并获取您的私钥。

## Build And Run

从项目的根目录构建并启动项目

```bash
elizaos start
```

您现在可以在浏览器中打开[http://localhost:3000](http://localhost:3000/)，从而访问专属于您的AI代理

## Actions

### STORAGE_UPLOAD

当用户想要将文件或者AI代理生成的回答上传到Storacha分布式存储网络时，请使用此操作。

**别名**

- `UPLOAD`
- `STORE`
- `SAVE`
- `PUT`
- `PIN`

### STORAGE_RETRIEVE

当用户要求您根据 CID 从 Storacha 网络检索文件时，请使用此操作。

**别名**

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