import * as model from "@/model";
import {ANSI_BOLD, ANSI_BRIGHT_BLUE, ANSI_BRIGHT_MAGENTA, ANSI_CYAN, ANSI_GREEN, ANSI_MAGENTA, ANSI_RESET, Sakiko, type ISakikoAdapter, type IEventBus, type ILogger} from "@grouptogawa/sakiko";
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
import type {OnebotV11EventLike} from ".";
import {Message, MessageSegment} from "./message";
import type {GroupMessageAnonymous, MessageType} from "./event";

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

// 定义 SelfLike 类型，用于表示可以是 selfId 字符串、事件对象或事件对象的 selfId 属性
type SelfLike = string | number | OnebotV11EventLike;

/**
 * Sakiko 框架的 Onebot v11 适配器
 */
export class SakikoAdapterOnebot implements ISakikoAdapter {
  /** 适配器名称 */
  readonly name = "sakiko-adapter-onebot";
  /** 适配器显示名称 */
  readonly displayName = ANSI_GREEN + ANSI_BOLD + "Onebot V11" + ANSI_RESET;
  /** 适配器版本 */
  readonly version = "0.1.0";
  /** 协议名称 */
  readonly protocolName = "ob11";
  /** 平台名称 */
  readonly platformName = "cross-platform";

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
    if (config) {
      this.config = {...this.config, ...config};
    }
  }

  /** 初始化适配器 */
  init(sakiko: Sakiko): void {
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
        this.logger?.info(
          `[${this.displayName}] [To ${ANSI_MAGENTA}${event.selfId}${ANSI_RESET}] [Group ${ANSI_BRIGHT_BLUE}${event.groupId}${ANSI_RESET}] ${event.sender.nickname}(${event.userId}): ${event.message.summary()}`
        );
      });
      sakiko.on(PrivateMessageEvent).handle(event => {
        this.logger?.info(`[${this.displayName}] [To ${ANSI_MAGENTA}${event.selfId}${ANSI_RESET}] [Private] ${event.sender.nickname}(${event.userId}): ${event.message.summary()}`);
      });
    }
  }

  /** 启动适配器 */
  start(): void | Promise<void> {
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
  stop(): void | Promise<void> {
    // 关闭所有 WebSocket 连接
    this.connections.forEach(account => {
      account.wsConn.close();
    });
    this.connections.clear();

    this.sakiko?.info(`[${this.displayName}] ${ANSI_GREEN}${this.name}${ANSI_RESET} stopped.`);
  }

  /** 适配器 UUID */
  uuid: string = randomUUID();

  /** 调用 Onebot V11 API */
  async callApi(self: SelfLike, action: string, params: model.IAPIRequest): Promise<model.IAPIResponse> {
    // 根据是否启用 HTTP POST，call api 有两种模式
    // 默认情况下直接通过 WebSocket 通信调用协议实现的 API 即可，大部分的 Onebot 协议实现应该都有这个功能
    // 对于少部分的情况，可以通过正向 WebSocket 配合 HTTP POST 实现调用 API
    // 反向 WebSocket 如果还要加上 HTTP POST 就有点显得过于脱裤子放屁，都几把让适配器当服务端了为什么还要放个 HTTP POST 进去，反正正向也不是不能用
    // 总之我懒得写完 Onebot v11 的所有连接模式的支持，如果有别的想法欢迎 PR

    // 获取对应账号的连接对象
    let selfId: string;
    switch (typeof self) {
      case "string":
        selfId = self;
        break;
      case "number":
        selfId = self.toString();
        break;
      case "object":
        selfId = self.selfId;
        break;
      default:
        throw new Error(`[${this.displayName}] invalid selfId type: ${typeof self}`);
    }
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
  async _callApiWithWebSocket(account: Account, action: string, params: model.IAPIRequest): Promise<model.IAPIResponse> {
    const echo = randomUUID();

    this.logger?.info(`[${this.displayName}] calling api "${ANSI_CYAN}${action}${ANSI_RESET}" with id ${ANSI_MAGENTA}${echo}${ANSI_RESET} through websocket...`);

    // 发送 WebSocket 消息
    account.wsConn.send(new model.WebSocketMessageRequest(action, params, echo).toString());

    // 等待 WebSocket 响应
    const response = await new Promise<model.IAPIResponse>((resolve, reject) => {
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

            this.logger?.info(`[${this.displayName}] api "${ANSI_CYAN}${action}${ANSI_RESET}" responsed with id ${ANSI_MAGENTA}${echo}${ANSI_RESET}.`);
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
  async _callApiWithHttpPost(account: Account, action: string, params: model.IAPIRequest): Promise<model.IAPIResponse> {
    this.logger?.info(`[${this.displayName}] calling api "${ANSI_CYAN}${action}${ANSI_RESET}" through http post...`);

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

      this.logger?.info(`[${this.displayName}] api "${ANSI_CYAN}${action}${ANSI_RESET}" responsed`);

      return data as model.IAPIResponse;
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
        this.logger?.info(`[${this.displayName}] Account ${ANSI_MAGENTA}${selfId}${ANSI_RESET} disconnected.`);
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
          this.logger?.info(`[${this.displayName}] Account ${ANSI_MAGENTA}${event.selfId}${ANSI_RESET} connected.`);
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
    this.logger?.info(`[${this.displayName}] listening websocket connection on ${ANSI_CYAN}ws://${this.config.host}:${this.config.port}${this.config.path}${ANSI_RESET}`);

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

  /** 快捷方式，发送私聊消息 */
  async sendPrivateMsg(self: SelfLike, params: model.SendPrivateMsgRequest): Promise<model.SendPrivateMsgResponse> {
    return this.callApi(self, "send_private_msg", params) as Promise<model.SendPrivateMsgResponse>;
  }

  /** 快捷方式，发送群消息 */
  async sendGroupMsg(self: SelfLike, params: model.SendGroupMsgRequest): Promise<model.SendGroupMsgResponse> {
    return this.callApi(self, "send_group_msg", params) as Promise<model.SendGroupMsgResponse>;
  }

  /** 快捷方式，发送消息 */
  async sendMsg(self: SelfLike, params: model.SendMsgRequest): Promise<model.SendMsgResponse> {
    return this.callApi(self, "send_msg", params) as Promise<model.SendMsgResponse>;
  }

  /** 快捷方式，撤回消息 */
  async deleteMsg(self: SelfLike, params: model.DeleteMsgRequest): Promise<model.DeleteMsgResponse> {
    return this.callApi(self, "delete_msg", params) as Promise<model.DeleteMsgResponse>;
  }

  /** 快捷方式，获取消息 */
  async getMsg(self: SelfLike, params: model.GetMsgRequest): Promise<model.GetMsgResponse> {
    return this.callApi(self, "get_msg", params) as Promise<model.GetMsgResponse>;
  }

  /** 快捷方式，获取合并转发消息 */
  async getForwardMsg(self: SelfLike, params: model.GetForwardMsgRequest): Promise<model.GetForwardMsgResponse> {
    return this.callApi(self, "get_forward_msg", params) as Promise<model.GetForwardMsgResponse>;
  }

  /** 快捷方式，发送好友赞 */
  async sendLike(self: SelfLike, params: model.SendLikeRequest): Promise<{}> {
    return this.callApi(self, "send_like", params) as Promise<{}>;
  }

  /** 快捷方式，群组踢人 */
  async setGroupKick(self: SelfLike, params: model.SetGroupKickRequest): Promise<{}> {
    return this.callApi(self, "set_group_kick", params) as Promise<{}>;
  }

  /** 快捷方式，群组单人禁言 */
  async setGroupBan(self: SelfLike, params: model.SetGroupBanRequest): Promise<{}> {
    return this.callApi(self, "set_group_ban", params) as Promise<{}>;
  }

  /** 快捷方式，群组匿名用户禁言 */
  async setGroupAnonymousBan(self: SelfLike, params: model.SetGroupAnonymousBanRequest): Promise<{}> {
    return this.callApi(self, "set_group_anonymous_ban", params) as Promise<{}>;
  }

  /** 快捷方式，群组全员禁言 */
  async setGroupWholeBan(self: SelfLike, params: model.SetGroupWholeBanRequest): Promise<{}> {
    return this.callApi(self, "set_group_whole_ban", params) as Promise<{}>;
  }

  /** 快捷方式，群组设置管理员 */
  async setGroupAdmin(self: SelfLike, params: model.SetGroupAdminRequest): Promise<{}> {
    return this.callApi(self, "set_group_admin", params) as Promise<{}>;
  }
  /** 快捷方式，群组匿名 */
  async setGroupAnonymous(self: SelfLike, params: model.SetGroupAnonymousRequest): Promise<{}> {
    return this.callApi(self, "set_group_anonymous", params) as Promise<{}>;
  }

  /** 快捷方式，设置群名片（群备注） */
  async setGroupCard(self: SelfLike, params: model.SetGroupCardRequest): Promise<{}> {
    return this.callApi(self, "set_group_card", params) as Promise<{}>;
  }

  /** 快捷方式，设置群名 */
  async setGroupName(self: SelfLike, params: model.SetGroupNameRequest): Promise<{}> {
    return this.callApi(self, "set_group_name", params) as Promise<{}>;
  }

  /** 快捷方式，退出群组 */
  async setGroupLeave(self: SelfLike, params: model.SetGroupLeaveRequest): Promise<{}> {
    return this.callApi(self, "set_group_leave", params) as Promise<{}>;
  }

  /** 快捷方式，设置群组专属头衔 */
  async setGroupSpecialTitle(self: SelfLike, params: model.SetGroupSpecialTitleRequest): Promise<{}> {
    return this.callApi(self, "set_group_special_title", params) as Promise<{}>;
  }

  /** 快捷方式，处理加好友请求 */
  async setFriendAddRequest(self: SelfLike, params: model.SetFriendAddRequestRequest): Promise<{}> {
    return this.callApi(self, "set_friend_add_request", params) as Promise<{}>;
  }

  /** 快捷方式，处理加群请求／邀请 */
  async setGroupAddRequest(self: SelfLike, params: model.SetGroupAddRequestRequest): Promise<{}> {
    return this.callApi(self, "set_group_add_request", params) as Promise<{}>;
  }

  /** 快捷方式，获取登录号信息 */
  async getLoginInfo(self: SelfLike): Promise<model.GetLoginInfoResponse> {
    return this.callApi(self, "get_login_info", {}) as Promise<model.GetLoginInfoResponse>;
  }

  /** 快捷方式，获取陌生人信息 */
  async getStrangerInfo(self: SelfLike, params: model.GetStrangerInfoRequest): Promise<model.GetStrangerInfoResponse> {
    return this.callApi(self, "get_stranger_info", params) as Promise<model.GetStrangerInfoResponse>;
  }

  /** 快捷方式，获取好友列表 */
  async getFriendList(self: SelfLike): Promise<model.GetFriendListResponse> {
    return this.callApi(self, "get_friend_list", {}) as Promise<model.GetFriendListResponse>;
  }

  /** 快捷方式，获取群信息 */
  async getGroupInfo(self: SelfLike, params: model.GetGroupInfoRequest): Promise<model.GetGroupInfoResponse> {
    return this.callApi(self, "get_group_info", params) as Promise<model.GetGroupInfoResponse>;
  }

  /** 快捷方式，获取群列表 */
  async getGroupList(self: SelfLike): Promise<model.GetGroupListResponse> {
    return this.callApi(self, "get_group_list", {}) as Promise<model.GetGroupListResponse>;
  }

  /** 快捷方式，获取群成员信息 */
  async getGroupMemberInfo(self: SelfLike, params: model.GetGroupMemberInfoRequest): Promise<model.GetGroupMemberInfoResponse> {
    return this.callApi(self, "get_group_member_info", params) as Promise<model.GetGroupMemberInfoResponse>;
  }

  /** 快捷方式，获取群成员列表 */
  async getGroupMemberList(self: SelfLike, params: model.GetGroupMemberListRequest): Promise<model.GetGroupMemberListResponse> {
    return this.callApi(self, "get_group_member_list", params) as Promise<model.GetGroupMemberListResponse>;
  }

  /** 快捷方式，获取群荣誉信息 */
  async getGroupHonorInfo(self: SelfLike, params: model.GetGroupHonorInfoRequest): Promise<model.GetGroupHonorInfoResponse> {
    return this.callApi(self, "get_group_honor_info", params) as Promise<model.GetGroupHonorInfoResponse>;
  }

  /** 快捷方式，获取 Cookies */
  async getCookies(self: SelfLike, params: model.GetCookiesRequest): Promise<model.GetCookiesResponse> {
    return this.callApi(self, "get_cookies", params) as Promise<model.GetCookiesResponse>;
  }

  /** 快捷方式，获取 CSRF Token */
  async getCsrfToken(self: SelfLike): Promise<model.GetCsrfTokenResponse> {
    return this.callApi(self, "get_csrf_token", {}) as Promise<model.GetCsrfTokenResponse>;
  }

  /** 快捷方式，获取 QQ 相关接口凭证 */
  async getCredentials(self: SelfLike, params: model.GetCredentialsRequest): Promise<model.GetCredentialsResponse> {
    return this.callApi(self, "get_credentials", params) as Promise<model.GetCredentialsResponse>;
  }

  /** 快捷方式，获取语音 */
  async getRecord(self: SelfLike, params: model.GetRecordRequest): Promise<model.GetRecordResponse> {
    return this.callApi(self, "get_record", params) as Promise<model.GetRecordResponse>;
  }

  /** 快捷方式，获取图片 */
  async getImage(self: SelfLike, params: model.GetImageRequest): Promise<model.GetImageResponse> {
    return this.callApi(self, "get_image", params) as Promise<model.GetImageResponse>;
  }

  /** 快捷方式，检查是否可以发送图片 */
  async canSendImage(self: SelfLike): Promise<model.CanSendImageResponse> {
    return this.callApi(self, "can_send_image", {}) as Promise<model.CanSendImageResponse>;
  }

  /** 快捷方式，检查是否可以发送语音 */
  async canSendRecord(self: SelfLike): Promise<model.CanSendRecordResponse> {
    return this.callApi(self, "can_send_record", {}) as Promise<model.CanSendRecordResponse>;
  }

  /** 快捷方式，获取状态 */
  async getStatus(self: SelfLike): Promise<model.GetStatusResponse> {
    return this.callApi(self, "get_status", {}) as Promise<model.GetStatusResponse>;
  }

  /** 快捷方式，获取版本信息 */
  async getVersionInfo(self: SelfLike): Promise<model.GetStatusInfoResponse> {
    return this.callApi(self, "get_version_info", {}) as Promise<model.GetStatusInfoResponse>;
  }

  /** 快捷方式，重启 OneBot 实现 */
  async setRestart(self: SelfLike): Promise<model.SetRestartResponse> {
    return this.callApi(self, "set_restart", {}) as Promise<model.SetRestartResponse>;
  }

  /** 快捷方式，清理缓存 */
  async cleanCache(self: SelfLike): Promise<model.CleanCacheResponse> {
    return this.callApi(self, "clean_cache", {}) as Promise<model.CleanCacheResponse>;
  }
}

// 导出事件定义、消息定义以及数据模型
export * from "./event";
export * from "./message";
export * from "./model";
export * from "./utils";
export * from "./factory";
