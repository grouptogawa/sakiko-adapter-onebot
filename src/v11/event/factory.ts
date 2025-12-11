import * as me from "./message-event";
import * as mee from "./meta-event";
import type * as meep from "../payload/event/meta";
import type * as mep from "../payload/event/message";
import * as ne from "./notice-event";
import type * as nep from "../payload/event/notice";
import * as re from "./request-event";
import type * as rep from "../payload/event/request";

import { Bot } from "../bot";
import type { OB11BaseEvent } from "./base-event";
import type { OB11EventPayload } from "../payload/event/base";

const postTypeMap = {
    message: (bot: Bot, payload: mep.OB11MessageEventPayload) => messageTypeMap[payload.message_type](bot, payload as any),
    notice: (bot: Bot, payload: nep.OB11NoticePayload) => noticeTypeMap[payload.notice_type](bot, payload as any),
    request: (bot: Bot, payload: rep.OB11RequestEventPayload) => requestTypeMap[payload.request_type](bot, payload as any),
    meta_event: (bot: Bot, payload: meep.OB11MetaEventPayload) => metaEventTypeMap[payload.meta_event_type](bot, payload as any)
};

const messageTypeMap = {
    private: (bot: Bot, payload: mep.OB11PrivateMessageEventPayload) => new me.PrivateMessageEvent(bot, payload),
    group: (bot: Bot, payload: mep.OB11GroupMessageEventPayload) => new me.GroupMessageEvent(bot, payload)
};

const noticeTypeMap = {
    group_upload: (bot: Bot, payload: nep.OB11GroupUploadEventPayload) => new ne.GroupUploadEvent(bot, payload),
    group_admin: (bot: Bot, payload: nep.OB11GroupAdminEventPayload) => new ne.GroupAdminEvent(bot, payload),
    group_decrease: (bot: Bot, payload: nep.OB11GroupDecreaseEventPayload) => new ne.GroupDecreaseEvent(bot, payload),
    group_increase: (bot: Bot, payload: nep.OB11GroupIncreaseEventPayload) => new ne.GroupIncreaseEvent(bot, payload),
    group_ban: (bot: Bot, payload: nep.OB11GroupBanEventPayload) => new ne.GroupBanEvent(bot, payload),
    friend_add: (bot: Bot, payload: nep.OB11FriendAddEventPayload) => new ne.FriendAddEvent(bot, payload),
    group_recall: (bot: Bot, payload: nep.OB11GroupRecallEventPayload) => new ne.GroupRecallEvent(bot, payload),
    friend_recall: (bot: Bot, payload: nep.OB11FriendRecallEventPayload) => new ne.FriendRecallEvent(bot, payload),
    group_msg_emoji_like: (bot: Bot, payload: nep.OB11GroupMsgEmojiLikeEventPayload) => new ne.GroupMsgEmojiLikeEvent(bot, payload),
    essence: (bot: Bot, payload: nep.OB11GroupEssenceEventPayload) => new ne.GroupEssenceEvent(bot, payload),
    group_card: (bot: Bot, payload: nep.OB11GroupCardEventPayload) => new ne.GroupCardEvent(bot, payload),
    notify: (bot: Bot, payload: nep.OB11NoticePayload & nep.OB11HasNotifySubType) => notifySubTypeMap[payload.sub_type](bot, payload as any),
    bot_offline: (bot: Bot, payload: nep.OB11BotOfflineEventPayload) => new ne.BotOfflineEvent(bot, payload)
};

const notifySubTypeMap = {
    poke: (bot: Bot, payload: nep.OB11NoticePayload & nep.OB11HasNotifySubType) => {
        if ((payload as any).group_id !== undefined) {
            return new ne.GroupPokeEvent(bot, payload as nep.OB11GroupPokeEventPayload);
        } else {
            return new ne.FriendPokeEvent(bot, payload as nep.OB11FriendPokeEventPayload);
        }
    },
    profile_like: (bot: Bot, payload: nep.OB11ProfileLikeEventPayload) => new ne.ProfileLikeEvent(bot, payload),
    input_status: (bot: Bot, payload: nep.OB11InputStatusEventPayload) => new ne.InputStatusEvent(bot, payload),
    lucky_king: (bot: Bot, payload: nep.OB11LuckyKingEventPayload) => new ne.LuckyKingEvent(bot, payload),
    honor: (bot: Bot, payload: nep.OB11GroupHonorEventPayload) => new ne.GroupHonorEvent(bot, payload),
    group_name: (bot: Bot, payload: nep.OB11GroupNameEventPayload) => new ne.GroupNameEvent(bot, payload),
    title: (bot: Bot, payload: nep.OB11GroupTitleEventPayload) => new ne.GroupTitleEvent(bot, payload)
};

const requestTypeMap = {
    friend: (bot: Bot, payload: rep.OB11FriendRequestEventPayload) => new re.FriendRequestEvent(bot, payload),
    group: (bot: Bot, payload: rep.OB11GroupRequestEventPayload) => new re.GroupRequestEvent(bot, payload)
};

const metaEventTypeMap = {
    heartbeat: (bot: Bot, payload: meep.OB11HeartbeatMetaEventPayload) => new mee.HeartbeatEvent(bot, payload),
    lifecycle: (bot: Bot, payload: meep.OB11LifecycleMetaEventPayload) => new mee.LifecycleEvent(bot, payload)
};

/**
 * 创建 Onebot V11 事件实例的工厂函数
 *
 * @param {Bot} bot 机器人实例
 * @param {OB11EventPayload} payload 事件负载
 * @returns {OB11BaseEvent<any> | null} 创建的事件实例，若无法识别则返回 null
 */
export function createEvent(bot: Bot, payload: OB11EventPayload): OB11BaseEvent<any> | null {
    return (postTypeMap[payload.post_type] || (() => null))(bot, payload as any);
}
