import type {IAPIRequest, IAPIResponse} from "@/model";
import {Sakiko, SakikoAdapter, type IEventBus, type ILogger} from "@grouptogawa/sakiko";
import {readFileSync} from "node:fs";
import type {ClientRequest, IncomingMessage} from "node:http";
import {createServer, Server} from "node:https";

import {WebSocket, WebSocketServer} from "ws";
import {eventFactory} from "./factory";
import {expectedAccessToken} from "./utils";

/**
 * Onebot v11 适配器的配置接口定义
 */
interface SakikoAdapterOnebotConfig {
  /** WebSocket 连接模式，分为正向（适配器作为客户端）和反向（适配器作为服务端）两种 */
  mode?: "forward" | "reverse";
  /** 用于正向连接模式的目标 WebSocket URL */
  urls?: string[];
  /** 反向模式下 WebSocket 服务端监听的主机地址 */
  host?: string;
  /** 反向模式下 WebSocket 服务端监听的端口 */
  port?: number;
  /** 用于和 Onebot v11 协议实现进行鉴权的令牌 */
  accessToken?: string;
  /** 反向模式下 WebSocket 服务端监听的路径 */
  path?: string;
  /** 反向模式下 TLS 证书文件路径，只有在证书文件和私钥文件都被传入时才会启用 HTTPS（WSS） 连接 */
  certPath?: string;
  /** 反向模式下 TLS 私钥文件路径，只有在证书文件和私钥文件都被传入时才会启用 HTTPS（WSS） 连接 */
  keyPath?: string;
  /** 是否启用 HTTP POST 用于和协议实现进行通信，仅在使用正向连接时有效。你只应该在知道自己在干什么时启用这个 */
  useHttpPost?: boolean;
  /** HTTP POST 的目标 URL 数组，必须和用于正向连接的 URL 配置数组一一对应 */
  httpPostUrls?: string[];
}

/**
 * Sakiko 框架的 Onebot v11 适配器
 */
export class SakikoAdapterOnebot extends SakikoAdapter {
  /** 适配器名称 */
  override readonly name = "sakiko-adapter-onebot";
  /** 适配器版本 */
  override readonly version = "0.1.0";
  /** 协议名称 */
  override readonly protocolName = "ob11";
  /** 平台名称 */
  override readonly platformName = "cross-platform";

  /** 适配器配置 */
  private config: SakikoAdapterOnebotConfig = {
    mode: "reverse",
    host: "127.0.0.1",
    port: 8080,
    path: "/onebot/v11/ws"
  };

  /** Sakiko 实例引用 */
  private sakiko: Sakiko | null = null;
  /** 事件总线引用 */
  private bus: IEventBus | null = null;
  /** 日志记录器 */
  logger: ILogger | null = null;

  /** 已连接的 WebSocket 连接集合 */
  private connections: Set<any> = new Set();
  /** 是否已初始化 */
  private initialized = false;
  /** WebSocket 连接模式 */
  private side: "client" | "server" | null = null;
  /** WebSocket 服务端实例 */
  private wss: WebSocketServer | null = null;

  constructor(config?: SakikoAdapterOnebotConfig) {
    super();
    if (config) {
      this.config = {...this.config, ...config};
    }
  }

  /** 初始化适配器 */
  override init(sakiko: Sakiko): void {
    this.sakiko = sakiko;
    this.logger = sakiko.getLogger();
    this.bus = sakiko.getBus();

    // 验证配置内容

    // 如果当前启用了正向连接模式：
    if (this.config.mode === "forward") {
      // 首先是 URL 不能为空
      if (!this.config.urls || this.config.urls.length === 0) {
        throw new Error(`[${this.name}] forward mode requires at least one url to connect to.`);
      }

      // 如果启动了 HTTP POST 功能，那么 HTTP POST URL 也不能为空
      if (this.config.useHttpPost && (!this.config.httpPostUrls || this.config.httpPostUrls.length === 0)) {
        throw new Error(`[${this.name}] forward mode with http post enabled requires at least one http post url.`);
      }

      // 确保 HTTP POST URL 数量和正向连接 URL 数量一致
      if (this.config.useHttpPost && this.config.urls.length !== this.config.httpPostUrls!.length) {
        // 前面已经验证过httpPostUrls不为空
        throw new Error(`[${this.name}] forward mode with http post enabled requires the same number of urls and http post urls.`);
      }
    }

    // 如果是在反向连接模式
    if (this.config.mode === "reverse") {
      // 如果传入了证书key或者私钥的路径，那么必须同时传入两者
      if ((this.config.certPath && !this.config.keyPath) || (!this.config.certPath && this.config.keyPath)) {
        throw new Error(`[${this.name}] reverse mode with ssl server requires both cert path and key path to be set.`);
      }
    }
  }

  /** 启动适配器 */
  override start(): void | Promise<void> {
    if (this.initialized) {
      this.logger?.warn(`[${this.name}] this adapter already started.`);
      return;
    }
    this.initialized = true;

    this.logger?.info(`[${this.name}] starting in ${this.config.mode} mode...`);

    if (this.config.mode === "forward") {
      this.side = "client";
      this._startWebsocketClient();
    } else if (this.config.mode === "reverse") {
      this.side = "server";
      this._startWebsocketServer();
    }
  }
  /** 停止适配器 */
  override stop(): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  /** 调用 Onebot V11 API */
  callApi(action: string, params: IAPIRequest): IAPIResponse {
    // 根据是否启用 HTTP POST，call api 有两种模式
    // 默认情况下直接通过 WebSocket 通信调用协议实现的 API 即可，大部分的 Onebot 协议实现应该都有这个功能
    // 对于少部分的情况，可以通过正向 WebSocket 配合 HTTP POST 实现调用 API
    // 反向 WebSocket 如果还要加上 HTTP POST 就有点显得过于脱裤子放屁，都几把让适配器当服务端了为什么还要放个 HTTP POST 进去，反正正向也不是不能用
    // 总之我懒得写完 Onebot v11 的所有连接模式的支持，如果有别的想法欢迎 PR
    if (!this.config.useHttpPost) {
      // TODO: 分别处理WebSocket和HTTP POST两种数据上调模式
    }

    throw new Error("Method not implemented.");
  }

  /** 处理 WebSocket 连接打开事件 */
  private _onConnectionOpened(connection: WebSocket) {
    this.logger?.debug(`[${this.name}] websocket connection to ${connection.url} opened.`);
    this.connections.add(connection);
  }

  /** 处理 WebSocket 连接关闭事件 */
  private _onConnectionClosed(connection: WebSocket, code: number, reason: string) {
    this.logger?.info(`[${this.name}] websocket connection to ${connection.url} closed: ${code}, ${reason}`);
    this.connections.delete(connection);
  }

  /** 处理 WebSocket 连接错误事件 */
  private _onConnectionError(connection: WebSocket, error: Error) {
    this.logger?.error(`[${this.name}] recieved error from ${connection.url}: ${error.message}`);
  }

  /** 处理 WebSocket 消息事件 */
  private _onMessageReceived(connection: WebSocket, data: string | Buffer<ArrayBufferLike> | ArrayBuffer | Buffer<ArrayBufferLike>[]) {
    this.logger?.debug(`[${this.name}] message received from ${connection.url}: ${data.toString()}`);

    // 把接收到的数据通过解析成事件对象传递给 Sakiko 进行处理
    try {
      const event = eventFactory(this.sakiko!, this, data);
      this.bus?.emit(event, this);
    } catch (e) {
      this.logger?.error(`[${this.name}] failed to parse event from data received from ${connection.url}: ${e}`);
    }
  }

  /** 处理 WebSocket 连接意外响应事件，Bun 不支持这个 WebSocket 事件 */
  private _onUnexpectedResponse(connection: WebSocket, request: ClientRequest, response: IncomingMessage) {
    this.logger?.error(`[${this.name}] unexpected response from ${connection.url}: ${response.statusCode}, ${response.statusMessage}`);
  }

  /** 启动 WebSocket 客户端 */
  private _startWebsocketClient() {
    // 正向 WebSocket 连接，适配器作为客户端连接到 Onebot V11 协议实现
    if (!this.config.urls) {
      this.logger?.error(`[${this.name}] no URL provided for WebSocket forward mode.`);
      return;
    }

    for (const url of this.config.urls) {
      // 建立连接
      const connection = new WebSocket(url, {
        headers: this.config.accessToken
          ? {Authorization: `Bearer ${this.config.accessToken}`} // 在连接 Header 里放入鉴权 Token
          : {}
      })
        .on("open", () => this._onConnectionOpened(connection))
        .on("close", (code, reason) => {
          this._onConnectionClosed(connection, code, reason.toString());
        })
        .on("error", error => {
          this._onConnectionError(connection, error);
        })
        .on("message", data => {
          this._onMessageReceived(connection, data);
        })
        .on("unexpected-response", (request, response) => {
          this._onUnexpectedResponse(connection, request, response);
        });
    }
  }

  /** 启动 WebSocket 服务器 */
  private _startWebsocketServer() {
    // 反向 WebSocket 连接，适配器作为服务器等待 Onebot V11 协议实现连接
    let sslServer: Server | undefined = undefined;

    // 如果配置了证书路径，则启用 HTTPS
    if (this.config.certPath && this.config.keyPath) {
      sslServer = createServer({
        cert: readFileSync(this.config.certPath!),
        key: readFileSync(this.config.keyPath!)
      });
    }

    // 建立连接
    this.logger?.info(`[${this.name}] listening websocket connection on ws://${this.config.host}:${this.config.port}${this.config.path}`);

    const wss = new WebSocketServer({
      host: this.config.host,
      port: this.config.port,
      path: this.config.path,
      server: sslServer
    }).on("connection", (connection, req) => {
      // 有新的连接尝试建立，对其进行鉴权
      const token = req.headers["authorization"];
      if (!token) {
        if (this.config.accessToken) {
          this.logger?.warn(`[${this.name}] connection from ${req.socket.remoteAddress} rejected: no access token provided.`);
          connection.close(1008, "no access token provided");
          return;
        }
        // 没有提供 token，但服务器也不需要鉴权，允许连接
      } else {
        if (this.config.accessToken && !expectedAccessToken(token, this.config.accessToken)) {
          this.logger?.warn(`[${this.name}] connection from ${req.socket.remoteAddress} rejected: invalid access token.`);
          connection.close(1008, "invalid access token");
          return;
        } else if (!this.config.accessToken) {
          this.logger?.warn(`[${this.name}] connection from ${req.socket.remoteAddress} provided access token but none expected.`);
          connection.close(1008, "no access token expected");
          return;
        }
        // 提供了 token，且鉴权通过
      }

      // 对鉴权通过的连接进行事件绑定
      connection
        .on("open", () => this._onConnectionOpened(connection))
        .on("close", (code, reason) => {
          this._onConnectionClosed(connection, code, reason.toString());
        })
        .on("error", error => {
          this._onConnectionError(connection, error);
        })
        .on("message", data => {
          this._onMessageReceived(connection, data);
        })
        .on("unexpected-response", (request, response) => {
          this._onUnexpectedResponse(connection, request, response);
        });
    });

    // 保存 WebSocket 服务器实例
    this.wss = wss;
  }

  /** 获取适配器运行模式 */
  getSide() {
    return this.side;
  }

  /** 获取所有已连接的 WebSocket 连接 */
  getAllConnections() {
    return Array.from(this.connections);
  }
}

// 导出事件定义、消息定义以及数据模型
export * from "./event";
export * from "./message";
export * from "./model";
