import { merge, Sakiko, SakikoAdapter } from "@togawa-dev/sakiko";
import { Bot } from "./bot";
import { WebSocket, WebSocketServer } from "ws";
import { createEvent } from "./event/factory";
import type { ClientRequest, IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { createServer, Server } from "node:https";
import chalk from "chalk";
import { expectedAccessToken, logEventMap } from "./utils";

interface OnebotV11AdapterConfig {
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

/** Onebot V11 适配器类
 *
 * @extends {SakikoAdapter}
 */
export class OnebotV11Adapter extends SakikoAdapter {
    override readonly name = "adapter-onebot-v11";
    override readonly displayName = "[" + chalk.cyan("OneBot V11") + "]";
    override readonly version = "0.3.1";
    override readonly description = "Sakiko 的 OneBot V11 协议适配器";
    override readonly protocolName = "onebot-v11";
    override readonly platformName = "cross-platform";

    private _initialized: boolean = false;
    private _sakiko?: Sakiko;
    private _adapterConfig: OnebotV11AdapterConfig = {
        mode: "reverse",
        host: "127.0.0.1",
        port: 8080,
        path: "/onebot/v11/ws",
        apiTimeout: 30000,
        logEvent: true
    };
    private _connectionMap: Map<WebSocket, Bot> = new Map();

    /** 获取当前适配器所绑定的 Sakiko 实例 */
    get sakiko() {
        if (this._sakiko) {
            return this._sakiko;
        } else {
            throw new Error("this adapter hasn't been installed to Sakiko yet");
        }
    }

    /** 获取 sakiko 实例携带的配置项 */
    get config() {
        return this.sakiko.config;
    }

    /** 获取当前适配器的配置项 */
    get adapterConfig() {
        return { ...this._adapterConfig };
    }

    /**
     * 将适配器安装到 Sakiko 实例中
     * @param sakiko Sakiko 实例
     * @returns 如果安装成功则返回 true，否则返回 false
     */
    override async install(sakiko: Sakiko): Promise<boolean> {
        this._sakiko = sakiko;

        this._readSakikoConfig(); // 读取 Sakiko 配置

        // 验证配置内容

        // 如果当前启用了正向连接模式：
        if (this._adapterConfig.mode === "forward") {
            // 首先是 URL 不能为空
            if (!this._adapterConfig.urls || this._adapterConfig.urls.length === 0) {
                const e = new Error(`forward mode requires at least one url to connect to.`);
                this.logger?.error(e.message);
                return false;
            }

            // 如果启动了 HTTP POST 功能，那么 HTTP POST URL 也不能为空
            if (this._adapterConfig.useHttpPost && (!this._adapterConfig.httpPostUrls || this._adapterConfig.httpPostUrls.length === 0)) {
                const e = new Error(`forward mode with http post enabled requires at least one http post url.`);
                this.logger?.error(e.message);
                return false;
            }

            // 确保 HTTP POST URL 数量和正向连接 URL 数量一致
            if (this._adapterConfig.useHttpPost && this._adapterConfig.urls.length !== this._adapterConfig.httpPostUrls!.length) {
                // 前面已经验证过httpPostUrls不为空
                const e = new Error(`forward mode with http post enabled requires the same number of urls and http post urls.`);
                this.logger?.error(e.message);
                return false;
            }
        }

        // 如果是在反向连接模式
        if (this._adapterConfig.mode === "reverse") {
            // 如果传入了证书key或者私钥的路径，那么必须同时传入两者
            if ((this._adapterConfig.certPath && !this._adapterConfig.keyPath) || (!this._adapterConfig.certPath && this._adapterConfig.keyPath)) {
                const e = new Error(`reverse mode with ssl server requires both cert path and key path to be set.`);
                this.logger?.error(e.message);
                return false;
            }
        }

        return true;
    }

    /** 将适配器从 Sakiko 实例中卸载 */
    override uninstall(sakiko: Sakiko): boolean | Promise<boolean> {
        // 调用清理方法
        this.cleanup();

        return true;
    }

    /** 清理适配器占用的资源 */
    override cleanup(): void | Promise<void> {
        // 首先取出现有的所有连接
        const connections = Array.from(this._connectionMap.keys());
        const bots = Array.from(this._connectionMap.values());

        // 关闭所有连接
        for (const conn of connections) {
            conn.close(1001, "adapter cleanup");
        }

        // 从 Sakiko 中移除所有 Bot 实例
        // for (const bot of bots) {
        //     this.sakiko?.removeBot(bot.selfId);
        // }

        // 关闭连接时会触发连接关闭事件，从而移除连接映射中的Bot，不需要手动移除

        // 清空连接映射
        this._connectionMap.clear();

        // 取消对 Sakiko 实例的引用
        this._sakiko = undefined;
    }

    /** 创建一个新的 Bot 实例并绑定到指定的 WebSocket 连接 */
    private _createBot(selfId: string, wsConn: WebSocket): Bot {
        return new Bot({ selfId, config: this.sakiko.configs, adapter: this }, wsConn);
    }

    /** 使用指定的配置项更新当前适配器的配置 */
    withConfig(config: OnebotV11AdapterConfig) {
        this._adapterConfig = { ...this._adapterConfig, ...config };
    }

    /** 读取 Sakiko 实例携带的配置并更新当前适配器的配置 */
    private _readSakikoConfig() {
        // 检查 Sakiko 存储的配置项中是否有适用于 Onebot V11 适配器的配置
        // 有则读取并覆盖当前适配器配置
        const sakikoConfig = this.sakiko.config.get("onebot_v11", {});
        // 合并配置
        this._adapterConfig = merge(this._adapterConfig, sakikoConfig as OnebotV11AdapterConfig);
    }

    // 通过钩子在 Sakiko 启动前启动 WebSocket连接
    async beforeSakikoStart() {
        if (this._initialized) {
            this.logger?.warn(`this adapter already started.`);
            return;
        }
        this._initialized = true;

        this.logger?.info(`starting in ${this._adapterConfig.mode} mode...`);

        if (this._adapterConfig.mode === "forward") {
            this._startWebsocketClient();
        } else if (this._adapterConfig.mode === "reverse") {
            this._startWebsocketServer();
        }
    }

    /** 处理 WebSocket 连接打开事件 */
    private _onConnectionOpened(connection: WebSocket) {
        this.logger?.debug(`websocket connection to ${connection.url} opened.`);
    }

    /** 处理 WebSocket 连接关闭事件 */
    private _onConnectionClosed(connection: WebSocket, code: number, reason: string) {
        this.logger?.debug(`websocket connection to ${connection.url} closed: ${code}, ${reason}`);

        // 当连接关闭时，从连接映射中找到对应的 Bot 实例
        const bot = this._connectionMap.get(connection);
        if (bot) {
            // 从 Sakiko 中移除该 Bot 实例
            this.sakiko?.removeBot(bot.selfId);
            // 从连接映射中移除该连接
            this._connectionMap.delete(connection);
            this.logger?.info(`bot ${chalk.yellowBright(bot.selfId)} disconnected.`);
            return;
        }

        this.logger?.warn(`a connection with no associated bot closed by "${reason}", code: ${code}`);
        return;
    }

    /** 处理 WebSocket 连接错误事件 */
    private _onConnectionError(connection: WebSocket, error: Error) {
        this.logger?.error(`recieved error from ${connection.url}: ${error.message}`);
    }

    /** 处理 WebSocket 消息事件 */
    private _onMessageReceived(connection: WebSocket, data: string | Buffer<ArrayBufferLike> | ArrayBuffer | Buffer<ArrayBufferLike>[]) {
        // 把接收到的数据通过解析成事件对象传递给 Sakiko 进行处理
        try {
            // 检查连接是否已经关联了 Bot 实例
            let bot = this._connectionMap.get(connection);
            if (!bot) {
                // 如果没有关联 Bot 实例，警告并跳过处理
                this.logger?.warn(`received message from unassociated connection ${connection.url}, ignoring.`);
                return;
            }

            const res = JSON.parse(data.toString());
            // 检测响应是携带了echo字段的API响应还是事件推送
            if (!res.echo && !res.action && !res.params) {
                const event = createEvent(bot, res);
                if (!event) {
                    // 事件工厂函数返回 null 说明数据不是一个事件，可能是响应之类的，直接忽略就行
                    return;
                }

                // 在这里调用日志打印功能
                if (this._adapterConfig.logEvent) {
                    (logEventMap[event.constructor.name] || (() => {}))(this.logger!, event);
                }

                this.sakiko?.bus.publish(event);
            }
        } catch (e) {
            this.logger?.error(`failed to create event from payload received from ${connection.url}: ${e}`);
        }
    }

    /** 处理 WebSocket 连接意外响应事件，Bun 不支持这个 WebSocket 事件 */
    private _onUnexpectedResponse(connection: WebSocket, request: ClientRequest, response: IncomingMessage) {
        this.logger?.error(`unexpected response from ${connection.url}: ${response.statusCode}, ${response.statusMessage}`);
    }

    /** 启动 WebSocket 客户端 */
    private _startWebsocketClient() {
        // 正向 WebSocket 连接，适配器作为客户端连接到 Onebot V11 协议实现
        if (!this._adapterConfig.urls) {
            this.logger?.error(`no URL provided for WebSocket forward mode.`);
            return;
        }

        for (const url of this._adapterConfig.urls) {
            // 用于标识连接是否已经绑定了 Bot 实例
            let binded = false;
            // 建立连接
            const connection = new WebSocket(url, {
                headers: this._adapterConfig.accessToken
                    ? {
                          Authorization: `Bearer ${this._adapterConfig.accessToken}`
                      } // 在连接 Header 里放入鉴权 Token
                    : {}
            })
                .on("open", () => this._onConnectionOpened(connection))
                .on("close", (code, reason) => {
                    this._onConnectionClosed(connection, code, reason.toString());
                })
                .on("error", (error) => {
                    this._onConnectionError(connection, error);
                })
                .on("message", (data) => {
                    if (binded) this._onMessageReceived(connection, data);
                    else {
                        // 检查是不是生命周期事件
                        try {
                            const payload = JSON.parse(data.toString());
                            if (payload.post_type === "meta_event" && payload.meta_event_type === "lifecycle" && payload.lifecycle === "connect") {
                                // 这是一个连接生命周期事件，创建 Bot 实例并绑定到连接
                                const bot = this._createBot(String(payload.self_id), connection);
                                this.sakiko?.addBot(bot);
                                this._connectionMap.set(connection, bot);
                                binded = true;
                                this.logger?.info(`bot ${bot.selfId} connected.`);
                            }
                        } catch (e) {
                            // 可能是随便什么别的，不需要处理
                            return;
                        }
                    }
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
        if (this._adapterConfig.certPath && this._adapterConfig.keyPath) {
            sslServer = createServer({
                cert: readFileSync(this._adapterConfig.certPath!),
                key: readFileSync(this._adapterConfig.keyPath!)
            });
        }

        // 建立连接
        this.logger?.info(`listening websocket connection on ${chalk.cyan(`ws://${this._adapterConfig.host}:${this._adapterConfig.port}${this._adapterConfig.path}`)}`);

        const wss = new WebSocketServer({
            host: this._adapterConfig.host,
            port: this._adapterConfig.port,
            path: this._adapterConfig.path,
            server: sslServer
        }).on("connection", (connection, req) => {
            // 标识当前连接是否已经绑定了 Bot 实例
            let binded = false;
            // 有新的连接尝试建立，对其进行鉴权
            const token = req.headers["authorization"];
            if (!token) {
                if (this._adapterConfig.accessToken) {
                    this.logger?.warn(`connection from ${req.socket.remoteAddress} rejected: no access token provided.`);
                    connection.close(1008, "no access token provided");
                    return;
                }
                // 没有提供 token，但服务器也不需要鉴权，允许连接
            } else {
                if (this._adapterConfig.accessToken && !expectedAccessToken(token, this._adapterConfig.accessToken)) {
                    this.logger?.warn(`connection from ${req.socket.remoteAddress} rejected: invalid access token.`);
                    connection.close(1008, "invalid access token");
                    return;
                } else if (!this._adapterConfig.accessToken) {
                    this.logger?.warn(`connection from ${req.socket.remoteAddress} provided access token but none expected.`);
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
                .on("error", (error) => {
                    this._onConnectionError(connection, error);
                })
                .on("message", (data) => {
                    if (binded) this._onMessageReceived(connection, data);
                    else {
                        // 检查是不是生命周期事件
                        try {
                            const payload = JSON.parse(data.toString());
                            if (payload.post_type === "meta_event" && payload.meta_event_type === "lifecycle" && payload.sub_type === "connect") {
                                // 这是一个连接生命周期事件，创建 Bot 实例并绑定到连接
                                const bot = this._createBot(String(payload.self_id), connection);
                                this.sakiko?.addBot(bot);
                                this._connectionMap.set(connection, bot);
                                binded = true;
                                this.logger?.info(`bot ${chalk.yellowBright(bot.selfId)} connected.`);
                            }
                        } catch (e) {
                            // 可能是随便什么别的，不需要处理
                            return;
                        }
                    }
                })
                .on("unexpected-response", (request, response) => {
                    this._onUnexpectedResponse(connection, request, response);
                });
        });
    }
}
