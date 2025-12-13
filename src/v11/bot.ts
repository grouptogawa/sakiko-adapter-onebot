import type { OnebotV11Adapter } from "./adapter";
import { SakikoBot, type ISakikoLogger, sf } from "@togawa-dev/sakiko";
import { WebSocket } from "ws";
import type { OB11APIAction, OB11APIRequestResponseMap } from "./payload/api/map";
import chalk from "chalk";
import type { SegmentLike } from "./message/segment";
import { Message } from "./message/msg";
import type { OB11GroupMessageAnonymous, OB11MessageType } from "./payload/event/message";
import type { OB11HonorType } from "./payload/event/notice";
import { MessageEvent } from "./event/message-event";

class WebSocketMessageRequest<Action extends OB11APIAction> {
    action: Action;
    params: OB11APIRequestResponseMap[Action]["req"];
    echo: string;

    constructor(action: Action, params: OB11APIRequestResponseMap[Action]["req"], echo: string) {
        this.action = action;
        this.params = params;
        this.echo = echo;
    }

    toString() {
        return JSON.stringify(this);
    }
}

/** Onebot V11 机器人账号类
 *
 * @extends {SakikoBot<OnebotV11Adapter>}
 */
export class Bot extends SakikoBot<OnebotV11Adapter> {
    constructor(
        options: {
            selfId: string;
            config: Record<string, any>;
            adapter: OnebotV11Adapter;
        },
        private readonly wsConn: WebSocket,
        private readonly httpPostUrl?: string
    ) {
        super(options);
    }

    /**
     * 通过适配器调用协议端实现的 Onebot V11 API
     *
     * @param action API 名称
     * @param params 请求参数
     * @returns 响应数据
     * @template Action API 名称类型
     */
    override async callApi<Action extends OB11APIAction>(action: Action, params: OB11APIRequestResponseMap[Action]["req"]): Promise<OB11APIRequestResponseMap[Action]["res"]> {
        // 根据是否启用了 HTTP POST 选择调用方式
        if (this.adapter.adapterConfig.useHttpPost) {
            return this._callApiWithHttpPost(action, params);
        } else {
            return this._callApiWithWebSocket(action, params);
        }
    }

    /** 通过 WebSocket 调用 Onebot V11 API */
    async _callApiWithWebSocket<Action extends OB11APIAction>(action: Action, params: OB11APIRequestResponseMap[Action]["req"]): Promise<OB11APIRequestResponseMap[Action]["res"]> {
        const echo = sf.base36();

        this.logger?.debug(`calling api ${chalk.yellowBright(action)} with identifier ${echo} through websocket...`);

        // 发送 WebSocket 消息
        this.wsConn.send(new WebSocketMessageRequest(action, params, echo).toString());

        // 等待 WebSocket 响应
        const response = await new Promise<OB11APIRequestResponseMap[Action]["res"]>((resolve, reject) => {
            // 监听特定的消息事件，当收到消息时判断是否是当前调用的 API 的响应，否则等待下一个响应直至超时
            const timeout = setTimeout(() => {
                reject(new Error(`websocket api call timeout on ${action} with identifier ${echo}`));
            }, this.adapter.adapterConfig.apiTimeout);

            const handler = (data: WebSocket.RawData) => {
                try {
                    const message = JSON.parse(data.toString());
                    // 先验证四个参数是否都存在
                    // if (!message.status || !message.retcode || !message.data || !message.echo) {
                    // 因为retcode这样的字段值可以是 0，会触发false判断，所以不能直接用!判断，要用===undefined
                    if (message.status === undefined || message.retcode === undefined || message.data === undefined || message.echo === undefined) {
                        reject(new Error(`websocket api call response is invalid: ${message}`));
                        this.wsConn.off("message", handler); // 移除监听器
                        return;
                    }
                    // 验证是否是当前调用的 API 的响应
                    if (message.echo === echo) {
                        clearTimeout(timeout);
                        resolve(message.data);
                        this.wsConn.off("message", handler); // 移除监听器

                        this.logger?.debug(`api ${chalk.yellowBright(action)} responsed with identifier ${echo}`);
                    }
                    // 继续等待
                } catch (e) {
                    reject(new Error(`failed to parse websocket response: ${e}`));
                    this.wsConn.off("message", handler); // 移除监听器
                }
            };

            this.wsConn.on("message", handler);
        });

        return response;
    }

    /** 通过 HTTP POST 调用 Onebot V11 API */
    async _callApiWithHttpPost<Action extends OB11APIAction>(action: Action, params: OB11APIRequestResponseMap[Action]["req"]): Promise<OB11APIRequestResponseMap[Action]["res"]> {
        this.logger?.debug(`calling api ${chalk.yellowBright(action)} through http post...`);

        // 获取对应的上报 URL
        const httpPostUrl = this.httpPostUrl!;
        // 拼接 url
        const apiUrl = new URL(action, httpPostUrl);

        // 创建超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.adapter.adapterConfig.apiTimeout);

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

            this.logger?.debug(`api ${chalk.yellowBright(action)} responsed`);

            return data as OB11APIRequestResponseMap[Action]["res"];
        } catch (error: any) {
            if (error.name === "AbortError") {
                throw new Error(`http post api call timeout on ${action}`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * 发送私聊消息
     * @param userId 目标用户ID
     * @param message 消息内容
     */
    async sendPrivateMessage<ME extends MessageEvent<any> = MessageEvent<any>>(userId: string | number | ME, message: string | SegmentLike[] | Message) {
        if (userId instanceof MessageEvent) {
            userId = userId.getSenderId();
        }
        if (typeof message === "string") {
            message = new Message().text(message);
        }
        return this.callApi("send_private_msg", {
            user_id: Number(userId),
            message: message
        });
    }

    /**
     * 发送群聊消息
     * @param groupId 目标群ID
     * @param message 消息内容
     */
    async sendGroupMessage<ME extends MessageEvent<any> = MessageEvent<any>>(groupId: string | number | ME, message: string | SegmentLike[] | Message) {
        if (groupId instanceof MessageEvent) {
            groupId = groupId.getPayload().group_id;
        }
        if (typeof message === "string") {
            message = new Message().text(message);
        }
        return this.callApi("send_group_msg", {
            group_id: Number(groupId),
            message: message
        });
    }

    /**
     * 发送消息（根据消息类型自动选择私聊或群聊）
     * @param messageType 消息类型，private 或 group
     * @param id 目标用户ID或群ID
     * @param message 消息内容
     */
    async sendMessage(messageType: "private" | "group", id: string | number, message: string | SegmentLike[] | Message): Promise<OB11APIRequestResponseMap["send_msg"]["res"]>;

    /**
     * 发送消息（根据消息事件自动选择私聊或群聊）
     * @param target 消息事件对象
     * @param message 消息内容
     */
    async sendMessage<ME extends MessageEvent<any> = MessageEvent<any>>(target: ME, message: string | SegmentLike[] | Message): Promise<OB11APIRequestResponseMap["send_msg"]["res"]>;

    async sendMessage(
        arg1: "private" | "group" | MessageEvent<any>,
        arg2: string | number | string | SegmentLike[] | Message,
        arg3?: string | SegmentLike[] | Message
    ): Promise<OB11APIRequestResponseMap["send_msg"]["res"]> {
        if (arg1 instanceof MessageEvent) {
            const target = arg1;
            const message = arg2 as string | SegmentLike[] | Message;
            const payload = target.getPayload();
            const messageType = payload.message_type;
            const id = messageType === "private" ? payload.user_id : payload.group_id;
            return this.sendMessage(messageType, id!, message);
        } else {
            const messageType = arg1;
            const id = arg2 as string | number;
            let message = arg3 as string | SegmentLike[] | Message;

            if (typeof message === "string") {
                message = new Message().text(message);
            }

            if (messageType === "private") {
                return this.callApi("send_msg", {
                    message_type: "private",
                    user_id: Number(id),
                    message
                });
            } else {
                return this.callApi("send_msg", {
                    message_type: "group",
                    group_id: Number(id),
                    message
                });
            }
        }
    }

    /**
     * 删除消息
     * @param messageId 消息ID
     */
    async deleteMessage(messageId: string | number) {
        return this.callApi("delete_msg", {
            message_id: Number(messageId)
        });
    }

    /** 获取消息内容
     * @param messageId 消息ID
     */
    async getMessage(messageId: string | number) {
        return await this.callApi("get_msg", {
            message_id: Number(messageId)
        });
    }

    /**
     * 获取消息记录指向的消息内容
     * @param forwardId 合并转发ID
     */
    async getForwardMessage(forwardId: string | number): Promise<Message> {
        const res = await this.callApi("get_forward_msg", {
            id: Number(forwardId)
        });
        const msg = res.message;
        if (Array.isArray(msg)) {
            return new Message(...msg);
        } else {
            return new Message().text(msg.toString());
        }
    }

    /**
     * 发送好友点赞
     * @param userId 用户ID
     * @param times 点赞次数，默认为1
     */
    async sendLike(userId: string | number, times: number = 1) {
        return this.callApi("send_like", {
            user_id: Number(userId),
            times: times
        });
    }

    /**
     * 将成员踢出群聊
     * @param groupId 群号
     * @param userId 成员 QQ 号
     * @param rejectAddRequest 是否拒绝此人的加群请求
     */
    async setGroupKick(groupId: string | number, userId: string | number, rejectAddRequest: boolean = false) {
        return this.callApi("set_group_kick", {
            group_id: Number(groupId),
            user_id: Number(userId),
            reject_add_request: rejectAddRequest
        });
    }

    /**
     * 设置群成员禁言
     * @param groupId 群号
     * @param userId 成员 QQ 号
     * @param duration 禁言时长（秒）
     */
    async setGroupBan(groupId: string | number, userId: string | number, duration: number) {
        return this.callApi("set_group_ban", {
            group_id: Number(groupId),
            user_id: Number(userId),
            duration: duration
        });
    }

    /**
     * 设置群匿名用户禁言
     * @param groupId 群号
     * @param duration 禁言时长（秒）
     * @param options 匿名信息或标识
     */
    async setGroupAnonymousBan(
        groupId: string | number,
        duration: number,
        options: {
            anonymous?: OB11GroupMessageAnonymous;
            anonymousFlag?: string;
            flag?: string;
        } = {}
    ) {
        return this.callApi("set_group_anonymous_ban", {
            group_id: Number(groupId),
            duration: duration,
            anonymous: options.anonymous,
            anonymous_flag: options.anonymousFlag,
            flag: options.flag
        });
    }

    /**
     * 设置群全员禁言
     * @param groupId 群号
     * @param enable 是否开启
     */
    async setGroupWholeBan(groupId: string | number, enable: boolean) {
        return this.callApi("set_group_whole_ban", {
            group_id: Number(groupId),
            enable: enable
        });
    }

    /**
     * 设置群管理员
     * @param groupId 群号
     * @param userId 成员 QQ 号
     * @param enable 是否设为管理员
     */
    async setGroupAdmin(groupId: string | number, userId: string | number, enable: boolean) {
        return this.callApi("set_group_admin", {
            group_id: Number(groupId),
            user_id: Number(userId),
            enable: enable
        });
    }

    /**
     * 设置群匿名功能
     * @param groupId 群号
     * @param enable 是否开启匿名
     */
    async setGroupAnonymous(groupId: string | number, enable: boolean) {
        return this.callApi("set_group_anonymous", {
            group_id: Number(groupId),
            enable: enable
        });
    }

    /**
     * 设置群名片
     * @param groupId 群号
     * @param userId 成员 QQ 号
     * @param card 群名片内容
     */
    async setGroupCard(groupId: string | number, userId: string | number, card: string) {
        return this.callApi("set_group_card", {
            group_id: Number(groupId),
            user_id: Number(userId),
            card: card
        });
    }

    /**
     * 设置群名称
     * @param groupId 群号
     * @param groupName 群名称
     */
    async setGroupName(groupId: string | number, groupName: string) {
        return this.callApi("set_group_name", {
            group_id: Number(groupId),
            group_name: groupName
        });
    }

    /**
     * 退出群聊
     * @param groupId 群号
     * @param isDismiss 是否解散（如果机器人是群主）
     */
    async setGroupLeave(groupId: string | number, isDismiss: boolean = false) {
        return this.callApi("set_group_leave", {
            group_id: Number(groupId),
            is_dismiss: isDismiss
        });
    }

    /**
     * 设置群专属头衔
     * @param groupId 群号
     * @param userId 成员 QQ 号
     * @param title 头衔
     * @param duration 有效期，单位秒
     */
    async setGroupSpecialTitle(groupId: string | number, userId: string | number, title: string, duration: number) {
        return this.callApi("set_group_special_title", {
            group_id: Number(groupId),
            user_id: Number(userId),
            special_title: title,
            duration: duration
        });
    }

    /**
     * 处理加好友请求
     * @param flag 请求标识
     * @param approve 是否同意
     * @param remark 备注
     */
    async setFriendAddRequest(flag: string, approve: boolean, remark: string = "") {
        return this.callApi("set_friend_add_request", {
            flag: flag,
            approve: approve,
            remark: remark
        });
    }

    /**
     * 处理加群请求／邀请
     * @param flag 请求标识
     * @param approve 是否同意
     * @param type 请求类型，invite 或 approve
     * @param subType 子类型，invite 或 approve
     * @param reason 拒绝原因
     */
    async setGroupAddRequest(flag: string, approve: boolean, type?: "invite" | "approve", subType?: "invite" | "approve", reason?: string) {
        return this.callApi("set_group_add_request", {
            flag: flag,
            approve: approve,
            type: type,
            sub_type: subType,
            reason: reason
        });
    }

    /** 获取登录号信息 */
    async getLoginInfo() {
        return this.callApi("get_login_info", {});
    }

    /**
     * 获取陌生人信息
     * @param userId 用户ID
     * @param noCache 是否不使用缓存
     */
    async getStrangerInfo(userId: string | number, noCache?: boolean) {
        return this.callApi("get_stranger_info", {
            user_id: Number(userId),
            no_cache: noCache
        });
    }

    /** 获取好友列表 */
    async getFriendList() {
        return this.callApi("get_friend_list", {});
    }

    /**
     * 获取群信息
     * @param groupId 群号
     * @param noCache 是否不使用缓存
     */
    async getGroupInfo(groupId: string | number, noCache?: boolean) {
        return this.callApi("get_group_info", {
            group_id: Number(groupId),
            no_cache: noCache
        });
    }

    /** 获取群列表 */
    async getGroupList() {
        return this.callApi("get_group_list", {});
    }

    /**
     * 获取群成员信息
     * @param groupId 群号
     * @param userId 成员 QQ 号
     * @param noCache 是否不使用缓存
     */
    async getGroupMemberInfo(groupId: string | number, userId: string | number, noCache?: boolean) {
        return this.callApi("get_group_member_info", {
            group_id: Number(groupId),
            user_id: Number(userId),
            no_cache: noCache
        });
    }

    /**
     * 获取群成员列表
     * @param groupId 群号
     */
    async getGroupMemberList(groupId: string | number) {
        return this.callApi("get_group_member_list", {
            group_id: Number(groupId)
        });
    }

    /**
     * 获取群荣誉信息
     * @param groupId 群号
     * @param type 荣誉类型
     */
    async getGroupHonorInfo(groupId: string | number, type: OB11HonorType) {
        return this.callApi("get_group_honor_info", {
            group_id: Number(groupId),
            type: type
        });
    }

    /**
     * 获取 Cookies
     * @param domain 域名
     */
    async getCookies(domain: string) {
        return this.callApi("get_cookies", {
            domain: domain
        });
    }

    /** 获取 CSRF Token */
    async getCsrfToken() {
        return this.callApi("get_csrf_token", {});
    }

    /**
     * 获取 QQ 相关接口凭证
     * @param domain 域名
     */
    async getCredentials(domain: string) {
        return this.callApi("get_credentials", {
            domain: domain
        });
    }

    /**
     * 获取语音文件
     * @param file 文件名
     * @param outFormat 输出格式
     */
    async getRecord(file: string, outFormat: string) {
        return this.callApi("get_record", {
            file: file,
            out_format: outFormat
        });
    }

    /**
     * 获取图片文件
     * @param file 文件名
     */
    async getImage(file: string) {
        return this.callApi("get_image", {
            file: file
        });
    }

    /** 检查是否可以发送图片 */
    async canSendImage() {
        return this.callApi("can_send_image", {});
    }

    /** 检查是否可以发送语音 */
    async canSendRecord() {
        return this.callApi("can_send_record", {});
    }

    /** 获取运行状态 */
    async getStatus() {
        return this.callApi("get_status", {});
    }

    /** 获取版本信息 */
    async getVersionInfo() {
        return this.callApi("get_version_info", {});
    }

    /**
     * 重启 OneBot 实现
     * @param delay 延迟时间（毫秒）
     */
    async setRestart(delay: number = 0) {
        return this.callApi("set_restart", {
            delay: delay
        });
    }

    /** 清理缓存 */
    async cleanCache() {
        return this.callApi("clean_cache", {});
    }
}
