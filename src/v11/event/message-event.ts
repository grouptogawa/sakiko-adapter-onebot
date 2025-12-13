import type { Messageable, Targetable, hasSender } from "@togawa-dev/sakiko";
import type { OB11GroupMessageEventPayload, OB11MessageEventPayload, OB11PrivateMessageEventPayload } from "../payload/event/message";

import type { Bot } from "../bot";
import { Message } from "../message/msg";
import { OB11BaseEvent } from "./base-event";

/**
 * Onebot V11 消息事件基类
 *
 * @template Payload 消息事件负载类型
 * @extends {OB11BaseEvent<Payload>}
 */
export class MessageEvent<Payload extends OB11MessageEventPayload> extends OB11BaseEvent<Payload> implements Messageable, hasSender, Targetable {
    constructor(bot: Bot, payload: Payload) {
        super(bot, payload);
    }

    getMessage(): Message {
        const msg = this.payload.message;
        if (Array.isArray(msg)) {
            return new Message(...msg);
        } else {
            // TODO: 解析CQ字符串类型的消息内容
            throw new Error("暂时不支持解析字符串类型的消息内容");
        }
    }

    summary(): string {
        return this.getMessage().summary();
    }

    plaintext(): string {
        return this.getMessage().plaintext();
    }

    mentioned(userId: string): boolean {
        return this.getMessage().mentioned(userId, false);
    }

    mentionedMe(): boolean {
        return this.mentioned(this.getSelfId());
    }

    getSenderId(): string {
        const id = this.payload.sender.user_id ?? (this.payload as any).user_id;
        return id !== undefined ? String(id) : "";
    }
}

/**
 * Onebot V11 私聊消息事件类
 *
 * @extends {MessageEvent<OB11PrivateMessageEventPayload>}
 */
export class PrivateMessageEvent extends MessageEvent<OB11PrivateMessageEventPayload> {
    constructor(bot: Bot, payload: OB11PrivateMessageEventPayload) {
        super(bot, payload);
    }
}

/**
 * Onebot V11 群聊消息事件类
 *
 * @extends {MessageEvent<OB11MessageEventPayload>}
 */
export class GroupMessageEvent extends MessageEvent<OB11GroupMessageEventPayload> {
    constructor(bot: Bot, payload: OB11GroupMessageEventPayload) {
        super(bot, payload);
    }
}
