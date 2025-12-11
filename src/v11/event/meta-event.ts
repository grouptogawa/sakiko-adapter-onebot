import type {
    OB11HeartbeatMetaEventPayload,
    OB11LifecycleMetaEventPayload,
    OB11MetaEventPayload
} from "../payload/event/meta";

import type { Bot } from "../bot";
import { OB11BaseEvent } from "./base-event";

/**
 * Onebot V11 元事件基类
 *
 * @template Payload 元事件负载类型
 * @extends {OB11BaseEvent<Payload>}
 */
export class MetaEvent<
    Payload extends OB11MetaEventPayload
> extends OB11BaseEvent<Payload> {
    constructor(bot: Bot, payload: Payload) {
        super(bot, payload);
    }
}

/**
 * Onebot V11 心跳元事件类
 *
 * @extends {MetaEvent<OB11HeartbeatMetaEventPayload>}
 */
export class HeartbeatEvent extends MetaEvent<OB11HeartbeatMetaEventPayload> {
    constructor(bot: Bot, payload: OB11HeartbeatMetaEventPayload) {
        super(bot, payload);
    }

    /**
     * 获取心跳状态对象
     *
     * @template T 心跳状态对象类型
     * @returns {T} 心跳状态对象
     */
    getStatus<T extends object>(): T {
        return this.payload.status as T;
    }
}

/**
 * Onebot V11 生命周期元事件类
 *
 * @extends {MetaEvent<OB11LifecycleMetaEventPayload>}
 */
export class LifecycleEvent extends MetaEvent<OB11LifecycleMetaEventPayload> {
    constructor(bot: Bot, payload: OB11LifecycleMetaEventPayload) {
        super(bot, payload);
    }
}
