import type { OB11EventPayload } from "./base";

type OB11MetaEventType = "heartbeat" | "lifecycle";

type OB11LifecycleMetaEventSubType = "enable" | "disable" | "connect";

export interface OB11MetaEventPayload extends OB11EventPayload {
    post_type: "meta_event";

    meta_event_type: OB11MetaEventType;
}

export interface OB11LifecycleMetaEventPayload extends OB11MetaEventPayload {
    meta_event_type: "lifecycle";

    sub_type: OB11LifecycleMetaEventSubType;
}

export interface OB11HeartbeatMetaEventPayload extends OB11MetaEventPayload {
    meta_event_type: "heartbeat";

    status: object | { online: boolean | undefined; good: boolean }; // 部分协议实现会返回具体状态对象
    interval: number;
}
