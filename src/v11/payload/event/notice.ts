import type { OB11EventPayload } from "./base";

type OB11NoticeType =
    | "group_upload"
    | "group_admin"
    | "group_decrease"
    | "group_increase"
    | "group_ban"
    | "friend_add"
    | "group_recall"
    | "friend_recall"
    | "group_msg_emoji_like"
    | "essence"
    | "group_card"
    | "notify"
    | "bot_offline";

type OB11NotifySubType =
    | "poke"
    | "profile_like"
    | "input_status"
    | "lucky_king"
    | "honor"
    | "group_name"
    | "title";

// 基础的通知事件负载定义

export interface OB11NoticePayload extends OB11EventPayload {
    post_type: "notice";

    notice_type: OB11NoticeType;
}

// 混入类型定义

export type OB11HasUserId = {
    user_id: number;
};

export type OB11HasGroupId = OB11HasUserId & {
    group_id: number;
};

export type OB11HasNotifySubType = {
    sub_type: OB11NotifySubType;
};

export type OB11HonorType =
    | "talkative"
    | "performer"
    | "emotion"
    | "legend"
    | "strong_newbie"
    | "all";

// 下面是具体的通知事件负载定义

export interface OB11GroupUploadEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_upload";

    file: {
        id: string;
        name: string;
        size: number;
        busid?: number;
    };
}

export interface OB11GroupAdminEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_admin";

    sub_type: "set" | "unset";
}

export interface OB11GroupDecreaseEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_decrease";

    sub_type: "kick_me" | "kick" | "leave" | "disband";
    operator_id: number;
}

export interface OB11GroupIncreaseEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_increase";

    sub_type: "approve" | "invite";
    operator_id: number;
}

export interface OB11GroupBanEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_ban";

    sub_type: "ban" | "lift_ban";
    operator_id: number;
    duration: number;
}

export interface OB11FriendAddEventPayload
    extends OB11NoticePayload, OB11HasUserId {
    notice_type: "friend_add";
}

export interface OB11GroupRecallEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_recall";

    operator_id: number;
    message_id: string;
}

export interface OB11FriendRecallEventPayload
    extends OB11NoticePayload, OB11HasUserId {
    notice_type: "friend_recall";

    message_id: string;
}

export interface OB11GroupPokeEventPayload
    extends OB11NoticePayload, OB11HasGroupId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "poke";

    target_id: number;
    raw_info?: unknown; // 非 Onebot v11 标准字段，部分协议实现支持
}

export interface OB11LuckyKingEventPayload
    extends OB11NoticePayload, OB11HasGroupId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "lucky_king";

    target_id: number;
}

export interface OB11GroupHonorEventPayload
    extends OB11NoticePayload, OB11HasGroupId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "honor";

    honor_type: OB11HonorType;
}

// 下面是一些由其他协议实现额外扩展的通知事件负载定义

export interface OB11GroupCardEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_card";

    card_new: string;
    card_old: string;
}

export interface OB11GroupNameEventPayload
    extends OB11NoticePayload, OB11HasGroupId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "group_name";

    name_new: string;
}

export interface OB11GroupTitleEventPayload
    extends OB11NoticePayload, OB11HasGroupId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "title";

    title: string;
}

export interface OB11GroupEssenceEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "essence";

    message_id: string;
    operator_id: number;
    sender_id: number;
    sub_type: "add" | "delete";
}

export interface OB11GroupMsgEmojiLikeEventPayload
    extends OB11NoticePayload, OB11HasGroupId {
    notice_type: "group_msg_emoji_like";

    message_id: string;
    likes: { emoji_id: string; count: number }[];
}

export interface OB11FriendPokeEventPayload
    extends OB11NoticePayload, OB11HasUserId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "poke";

    target_id: number;
    sender_id: number;
    raw_info?: unknown; // 非 Onebot v11 标准字段，部分协议实现支持
}

export interface OB11ProfileLikeEventPayload
    extends OB11NoticePayload, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "profile_like";

    operator_id: number;
    operator_nick: string;
    times: number;
}

export interface OB11InputStatusEventPayload
    extends OB11NoticePayload, OB11HasUserId, OB11HasNotifySubType {
    notice_type: "notify";
    sub_type: "input_status";

    status_text: string;
    event_type: number;
    group_id?: number;
}

export interface OB11BotOfflineEventPayload
    extends OB11NoticePayload, OB11HasUserId {
    notice_type: "bot_offline";

    tag: string;
    message: string;
}
