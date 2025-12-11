import type { OB11EventPayload } from "./base";
import type { SegmentLike } from "../../message/segment";

export type OB11MessageType = "private" | "group";

type OB11PrivateMessageSubType = "friend" | "group" | "other";
type OB11GroupMessageSubType = "normal" | "anonymous" | "notice";

export type OB11MessageSender = {
    user_id?: number;
    nickname?: string;
    sex?: string;
    age?: number;
};

export type OB11GroupMessageSender = OB11MessageSender & {
    card?: string;
    area?: string;
    level?: string;
    role?: string;
    title?: string;
};

export type OB11GroupMessageAnonymous = {
    id: number;
    name: string;
    flag: string;
};

export interface OB11MessageEventPayload extends OB11EventPayload {
    post_type: "message";

    message_type: OB11MessageType;
    sub_type: OB11PrivateMessageSubType | OB11GroupMessageSubType;
    message_id: number;
    user_id: number;
    message: SegmentLike[] | string;
    raw_message: string;
    font?: number;
    sender: OB11MessageSender | OB11GroupMessageSender;
}

export interface OB11PrivateMessageEventPayload extends OB11MessageEventPayload {
    message_type: "private";
    sub_type: OB11PrivateMessageSubType;
    sender: OB11MessageSender;

    target_id?: number; // 非 Onebot v11 标准字段，部分协议实现支持
    temp_source?: number; // 非 Onebot v11 标准字段，部分协议实现支持
}

export interface OB11GroupMessageEventPayload extends OB11MessageEventPayload {
    message_type: "group";
    sub_type: OB11GroupMessageSubType;
    sender: OB11GroupMessageSender;

    group_id: number;
    anonymous?: OB11GroupMessageAnonymous;
}
