import type {
    OB11FriendRequestEventPayload,
    OB11GroupRequestEventPayload,
    OB11RequestEventPayload
} from "../payload/event/request";

import type { Bot } from "../bot";
import { OB11BaseEvent } from "./base-event";

/**
 * Onebot V11 请求事件基类
 * @template Payload 请求事件负载类型
 * @extends {OB11BaseEvent<Payload>}
 */
export class RequestEvent<
    Payload extends OB11RequestEventPayload
> extends OB11BaseEvent<Payload> {
    constructor(bot: Bot, payload: Payload) {
        super(bot, payload);
    }
}

/**
 * Onebot V11 加群请求事件类
 * @extends {RequestEvent<OB11GroupRequestEventPayload>}
 */
export class GroupRequestEvent extends RequestEvent<OB11GroupRequestEventPayload> {
    constructor(bot: Bot, payload: OB11GroupRequestEventPayload) {
        super(bot, payload);
    }
}

/**
 * Onebot V11 添加好友请求事件类
 * @extends {RequestEvent<OB11FriendRequestEventPayload>}
 */
export class FriendRequestEvent extends RequestEvent<OB11FriendRequestEventPayload> {
    constructor(bot: Bot, payload: OB11FriendRequestEventPayload) {
        super(bot, payload);
    }
}
