import {WebSocketMessageRequest, type IAPIRequest, type IAPIResponse} from "@/model";
import {ANSI_BOLD, ANSI_GREEN, ANSI_MAGENTA, ANSI_RESET, Sakiko, SakikoAdapter, type IEventBus, type ILogger} from "@grouptogawa/sakiko";
import {readFileSync} from "node:fs";
import type {ClientRequest, IncomingMessage} from "node:http";
import {createServer, Server} from "node:https";

import {WebSocket, WebSocketServer} from "ws";
import {eventFactory} from "./factory";
import {expectedAccessToken} from "./utils";
import {randomUUID} from "node:crypto";
import {LifecycleMetaEvent} from ".";
import {GroupMessageEvent} from ".";
import {PrivateMessageEvent} from ".";
import {NoticeEvent} from ".";

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
  /** API 调用超时时间，单位毫秒 */
  apiTimeout?: number;
  /** 是否输出事件内容 */
  logEvent?: boolean;
}

interface Account {
  selfId: string;
  wsConn: WebSocket;
  httpPostUrl?: string;
}

/**
 * Sakiko 框架的 Onebot v11 适配器
 */
export class SakikoAdapterOnebot extends SakikoAdapter {
  /** 适配器名称 */
  override readonly name = "sakiko-adapter-onebot";
  /** 适配器显示名称 */
  readonly displayName = ANSI_GREEN + ANSI_BOLD + "Onebot V11" + ANSI_RESET;
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
    path: "/onebot/v11/ws",
    apiTimeout: 30000,
    logEvent: true
  };

  /** Sakiko 实例引用 */
  private sakiko: Sakiko | null = null;
  /** 事件总线引用 */
  private bus: IEventBus | null = null;
  /** 日志记录器 */
  logger: ILogger | null = null;

  /** 已连接的 WebSocket 连接映射 */
  private connections: Map<string, Account> = new Map();
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
        throw new Error(`[${this.displayName}] forward mode requires at least one url to connect to.`);
      }

      // 如果启动了 HTTP POST 功能，那么 HTTP POST URL 也不能为空
      if (this.config.useHttpPost && (!this.config.httpPostUrls || this.config.httpPostUrls.length === 0)) {
        throw new Error(`[${this.displayName}] forward mode with http post enabled requires at least one http post url.`);
      }

      // 确保 HTTP POST URL 数量和正向连接 URL 数量一致
      if (this.config.useHttpPost && this.config.urls.length !== this.config.httpPostUrls!.length) {
        // 前面已经验证过httpPostUrls不为空
        throw new Error(`[${this.displayName}] forward mode with http post enabled requires the same number of urls and http post urls.`);
      }
    }

    // 如果是在反向连接模式
    if (this.config.mode === "reverse") {
      // 如果传入了证书key或者私钥的路径，那么必须同时传入两者
      if ((this.config.certPath && !this.config.keyPath) || (!this.config.certPath && this.config.keyPath)) {
        throw new Error(`[${this.displayName}] reverse mode with ssl server requires both cert path and key path to be set.`);
      }
    }

    // 订阅各类事件用于输出提示信息
    if (this.config.logEvent) {
      sakiko.on(GroupMessageEvent).handle(event => {
        this.logger?.info(`[${this.displayName}] [to ${ANSI_MAGENTA}${event.selfId}${ANSI_RESET}] [群聊 #${event.groupId}] ${event.sender.nickname}(${event.userId}): ${event.message.summary()}`);
      });
      sakiko.on(PrivateMessageEvent).handle(event => {
        this.logger?.info(`[${this.displayName}] [to ${ANSI_MAGENTA}${event.selfId}${ANSI_RESET}] [私聊] ${event.sender.nickname}(${event.userId}): ${event.message.summary()}`);
      });
      sakiko.on(NoticeEvent).handle(event => {
        this.logger?.info(`[${this.displayName}] [to ${ANSI_MAGENTA}${event.selfId}${ANSI_RESET}] [通知] ${event.noticeType}: `);
      });
    }
  }

  /** 启动适配器 */
  override start(): void | Promise<void> {
    if (this.initialized) {
      this.logger?.warn(`[${this.displayName}] this adapter already started.`);
      return;
    }
    this.initialized = true;

    this.logger?.info(`[${this.displayName}] starting in ${this.config.mode} mode...`);

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
  callApi(selfId: string, action: string, params: IAPIRequest): IAPIResponse {
    // 根据是否启用 HTTP POST，call api 有两种模式
    // 默认情况下直接通过 WebSocket 通信调用协议实现的 API 即可，大部分的 Onebot 协议实现应该都有这个功能
    // 对于少部分的情况，可以通过正向 WebSocket 配合 HTTP POST 实现调用 API
    // 反向 WebSocket 如果还要加上 HTTP POST 就有点显得过于脱裤子放屁，都几把让适配器当服务端了为什么还要放个 HTTP POST 进去，反正正向也不是不能用
    // 总之我懒得写完 Onebot v11 的所有连接模式的支持，如果有别的想法欢迎 PR

    // 获取对应账号的连接对象
    const account = this.connections.get(selfId);
    if (!account) {
      throw new Error(`[${this.displayName}] no connection found for selfId ${selfId}`);
    }

    if (!this.config.useHttpPost) {
      return this._callApiWithWebSocket(account, action, params);
    }
    // 如果启用了 HTTP POST，那么就通过 HTTP POST 调用 API
    return this._callApiWithHttpPost(account, action, params);
  }

  /** 通过 WebSocket 调用 Onebot V11 API */
  async _callApiWithWebSocket(account: Account, action: string, params: IAPIRequest): Promise<IAPIResponse> {
    const echo = randomUUID();

    this.logger?.info(`[${this.displayName}] calling api "${action}" with id ${echo} through websocket...`);

    // 发送 WebSocket 消息
    account.wsConn.send(new WebSocketMessageRequest(action, params, echo).toString());

    // 等待 WebSocket 响应
    const response = await new Promise<IAPIResponse>((resolve, reject) => {
      // 监听特定的消息事件，当收到消息时判断是否是当前调用的 API 的响应，否则等待下一个响应直至超时
      const timeout = setTimeout(() => {
        reject(new Error(`[${this.displayName}] websocket api call timeout: ${action}`));
      }, this.config.apiTimeout);

      account.wsConn.on("message", data => {
        try {
          const message = JSON.parse(data.toString());
          // 先验证四个参数是否都存在
          // if (!message.status || !message.retcode || !message.data || !message.echo) {
          // 因为retcode这样的字段值可以是 0，会触发false判断，所以不能直接用!判断，要用===undefined
          if (message.status === undefined || message.retcode === undefined || message.data === undefined || message.echo === undefined) {
            reject(new Error(`[${this.displayName}] websocket api call response is invalid: ${message}`));
            return;
          }
          // 验证是否是当前调用的 API 的响应
          if (message.echo === echo) {
            clearTimeout(timeout);
            resolve(message.data);

            this.logger?.info(`[${this.displayName}] api "${action}" responsed with id ${echo}.`);
          }
          // 继续等待
        } catch (e) {
          reject(new Error(`[${this.displayName}] failed to parse websocket response: ${e}`));
        }
      });
    });

    return response;
  }

  /** 通过 HTTP POST 调用 Onebot V11 API */
  async _callApiWithHttpPost(account: Account, action: string, params: IAPIRequest): Promise<IAPIResponse> {
    this.logger?.info(`[${this.displayName}] calling api "${action}" through http post...`);

    // 获取对应的上报 URL
    const httpPostUrl = account.httpPostUrl!;
    // 拼接 url
    const apiUrl = new URL(action, httpPostUrl);

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.apiTimeout);

    try {
      // 发起http请求
      const response = await fetch(apiUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      // 解析响应体为 JSON
      const data = await response.json();

      this.logger?.info(`[${this.displayName}] api "${action}" responsed`);

      return data as IAPIResponse;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(`[${this.displayName}] http post api call timeout: ${action}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** 处理 WebSocket 连接打开事件 */
  private _onConnectionOpened(connection: WebSocket) {
    this.logger?.debug(`[${this.displayName}] websocket connection to ${connection.url} opened.`);
  }

  /** 处理 WebSocket 连接关闭事件 */
  private _onConnectionClosed(connection: WebSocket, code: number, reason: string) {
    this.logger?.debug(`[${this.displayName}] websocket connection to ${connection.url} closed: ${code}, ${reason}`);

    this.connections.forEach((account, selfId) => {
      // 如果这个连接已经被存储为某个账号的连接实例，那么就删除它
      if (account.wsConn === connection) {
        this.connections.delete(selfId);
        this.logger?.info(`[${this.displayName}] Account ${selfId} disconnected.`);
      }
    });
  }

  /** 处理 WebSocket 连接错误事件 */
  private _onConnectionError(connection: WebSocket, error: Error) {
    this.logger?.error(`[${this.displayName}] recieved error from ${connection.url}: ${error.message}`);
  }

  /** 处理 WebSocket 消息事件 */
  private _onMessageReceived(connection: WebSocket, data: string | Buffer<ArrayBufferLike> | ArrayBuffer | Buffer<ArrayBufferLike>[]) {
    this.logger?.debug(`[${this.displayName}] message received from ${connection.url}: ${data.toString()}`);

    // 把接收到的数据通过解析成事件对象传递给 Sakiko 进行处理
    try {
      const event = eventFactory(this.sakiko!, this, data);
      if (!event) {
        // 事件工厂函数返回 undefined 说明数据不是一个事件，可能是响应之类的，直接忽略就行
        return;
      }

      // 这里加一个过滤，如果事件是生命周期事件，滤出用于存储连接实例
      if (event instanceof LifecycleMetaEvent) {
        // 生命周期事件
        if (event.subType === "connect") {
          // 将当前连接实例存储到连接映射中
          this.connections.set(event.selfId, {
            selfId: event.selfId,
            wsConn: connection
          });
          this.logger?.info(`[${this.displayName}] Account ${event.selfId} connected.`);
        }
      }

      this.sakiko?.emit(event, this);
    } catch (e) {
      this.logger?.error(`[${this.displayName}] failed to parse event from data received from ${connection.url}: ${e}`);
    }
  }

  /** 处理 WebSocket 连接意外响应事件，Bun 不支持这个 WebSocket 事件 */
  private _onUnexpectedResponse(connection: WebSocket, request: ClientRequest, response: IncomingMessage) {
    this.logger?.error(`[${this.displayName}] unexpected response from ${connection.url}: ${response.statusCode}, ${response.statusMessage}`);
  }

  /** 启动 WebSocket 客户端 */
  private _startWebsocketClient() {
    // 正向 WebSocket 连接，适配器作为客户端连接到 Onebot V11 协议实现
    if (!this.config.urls) {
      this.logger?.error(`[${this.displayName}] no URL provided for WebSocket forward mode.`);
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
    this.logger?.info(`[${this.displayName}] listening websocket connection on ws://${this.config.host}:${this.config.port}${this.config.path}`);

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
          this.logger?.warn(`[${this.displayName}] connection from ${req.socket.remoteAddress} rejected: no access token provided.`);
          connection.close(1008, "no access token provided");
          return;
        }
        // 没有提供 token，但服务器也不需要鉴权，允许连接
      } else {
        if (this.config.accessToken && !expectedAccessToken(token, this.config.accessToken)) {
          this.logger?.warn(`[${this.displayName}] connection from ${req.socket.remoteAddress} rejected: invalid access token.`);
          connection.close(1008, "invalid access token");
          return;
        } else if (!this.config.accessToken) {
          this.logger?.warn(`[${this.displayName}] connection from ${req.socket.remoteAddress} provided access token but none expected.`);
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

  getConnections() {
    return this.connections;
  }
}

// 导出事件定义、消息定义以及数据模型
export * from "./event";
export * from "./message";
export * from "./model";
