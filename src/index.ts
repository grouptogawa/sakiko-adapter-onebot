// 导出需要导出的部分

// V11

// 事件导出
export { OB11BaseEvent } from "./v11/event/base-event";
export { createEvent } from "./v11/event/factory";
export { MessageEvent, PrivateMessageEvent, GroupMessageEvent } from "./v11/event/message-event";
export { HeartbeatEvent, LifecycleEvent } from "./v11/event/meta-event";
export * from "./v11/event/notice-event";
export { RequestEvent, GroupRequestEvent, FriendRequestEvent } from "./v11/event/request-event";

// 消息导出
export { Message, message } from "./v11/message/msg";
export { OB11Segments } from "./v11/message/segment";
export type {
    SegmentLike,
    Text,
    At,
    Reply,
    Face,
    MFace,
    Dice,
    RPS,
    Poke,
    Image,
    Record,
    Video,
    File,
    Shake,
    Json,
    Xml,
    Music,
    Forward,
    Anonymous,
    Share,
    Contact,
    Location,
    Node
} from "./v11/message/segment";
export { summarizeMessage, summarizeSeg } from "./v11/message/summary";

// 负载类型导出
export type { OB11APIAction, OB11APIRequestResponseMap } from "./v11/payload/api/map";
export type { OB11EventPayload } from "./v11/payload/event/base";
export type { OB11MessageEventPayload, OB11GroupMessageAnonymous, OB11PrivateMessageEventPayload } from "./v11/payload/event/message";
export type { OB11MetaEventPayload, OB11LifecycleMetaEventPayload, OB11HeartbeatMetaEventPayload } from "./v11/payload/event/meta";
export type * from "./v11/payload/event/notice";
export type { OB11RequestEventPayload, OB11GroupRequestEventPayload, OB11FriendRequestEventPayload } from "./v11/payload/event/request";

// 适配器和Bot导出
export { OnebotV11Adapter } from "./v11/adapter";
export { Bot } from "./v11/bot";
