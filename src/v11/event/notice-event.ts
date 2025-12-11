import type {
    OB11FriendAddEventPayload,
    OB11FriendPokeEventPayload,
    OB11FriendRecallEventPayload,
    OB11GroupAdminEventPayload,
    OB11GroupBanEventPayload,
    OB11GroupCardEventPayload,
    OB11GroupDecreaseEventPayload,
    OB11GroupEssenceEventPayload,
    OB11GroupHonorEventPayload,
    OB11GroupIncreaseEventPayload,
    OB11GroupNameEventPayload,
    OB11GroupPokeEventPayload,
    OB11GroupRecallEventPayload,
    OB11GroupTitleEventPayload,
    OB11GroupUploadEventPayload,
    OB11HasGroupId,
    OB11LuckyKingEventPayload,
    OB11NoticePayload,
    OB11GroupMsgEmojiLikeEventPayload,
    OB11ProfileLikeEventPayload,
    OB11BotOfflineEventPayload,
    OB11InputStatusEventPayload
} from "../payload/event/notice";

import type { Bot } from "../bot";
import { OB11BaseEvent } from "./base-event";
import type { hasSender, Targetable } from "@grouptogawa/sakiko";

/**
 * Onebot V11 通知事件基类
 *
 * @template Payload 通知事件负载类型
 * @extends {OB11BaseEvent<Payload>}
 */
export class NoticeEvent<
    Payload extends OB11NoticePayload
> extends OB11BaseEvent<Payload> {
    constructor(bot: Bot, payload: Payload) {
        super(bot, payload);
    }
}

/**
 * Onebot V11 群通知事件类
 *
 * @template Payload 群通知事件负载类型
 * @extends {NoticeEvent<Payload>}
 */
export class GroupNoticeEvent<
    Payload extends OB11NoticePayload & OB11HasGroupId
>
    extends NoticeEvent<Payload>
    implements Targetable
{
    constructor(bot: Bot, payload: Payload) {
        super(bot, payload);
    }

    isUser(userId: string | number): boolean {
        return this.getUserId() === String(userId);
    }

    getUserId(): string {
        return String(this.payload.user_id);
    }

    isGroup(groupId: string | number): boolean {
        return this.getGroupId() === String(groupId);
    }

    getGroupId(): string {
        return String(this.payload.group_id);
    }

    mentioned(userId: string | number): boolean {
        return String(this.payload.user_id) === String(userId);
    }

    mentionedMe(): boolean {
        return this.mentioned(this.getSelfId());
    }
}

/**
 * Onebot V11 群文件上传通知事件类
 *
 * @extends {NoticeEvent<OB11GroupUploadEventPayload>}
 */
export class GroupUploadEvent extends GroupNoticeEvent<OB11GroupUploadEventPayload> {
    constructor(bot: Bot, payload: OB11GroupUploadEventPayload) {
        super(bot, payload);
    }

    getFileName(): string {
        return this.payload.file.name;
    }

    getFileSize(): number {
        return this.payload.file.size;
    }
}

/**
 * Onebot V11 群管理员变更通知事件类
 *
 * @extends {NoticeEvent<OB11GroupAdminEventPayload>}
 */
export class GroupAdminEvent extends GroupNoticeEvent<OB11GroupAdminEventPayload> {
    constructor(bot: Bot, payload: OB11GroupAdminEventPayload) {
        super(bot, payload);
    }

    isSetAdmin(): boolean {
        return this.payload.sub_type === "set";
    }
}

/**
 * Onebot V11 群成员减少通知事件类
 *
 * @extends {NoticeEvent<OB11GroupDecreaseEventPayload>}
 */
export class GroupDecreaseEvent extends GroupNoticeEvent<OB11GroupDecreaseEventPayload> {
    constructor(bot: Bot, payload: OB11GroupDecreaseEventPayload) {
        super(bot, payload);
    }

    getOperatorId(): string {
        return String(this.payload.operator_id);
    }
}

/**
 * Onebot V11 群成员增加通知事件类
 *
 * @extends {NoticeEvent<OB11GroupIncreaseEventPayload>}
 */
export class GroupIncreaseEvent extends GroupNoticeEvent<OB11GroupIncreaseEventPayload> {
    constructor(bot: Bot, payload: OB11GroupIncreaseEventPayload) {
        super(bot, payload);
    }

    getOperatorId(): string {
        return String(this.payload.operator_id);
    }
}

/**
 * Onebot V11 群禁言通知事件类
 *
 * @extends {NoticeEvent<OB11GroupBanEventPayload>}
 */
export class GroupBanEvent extends GroupNoticeEvent<OB11GroupBanEventPayload> {
    constructor(bot: Bot, payload: OB11GroupBanEventPayload) {
        super(bot, payload);
    }

    getOperatorId(): string {
        return String(this.payload.operator_id);
    }

    getDuration(): number {
        return this.payload.duration;
    }

    isLift(): boolean {
        return this.payload.sub_type === "lift_ban";
    }
}

/**
 * Onebot V11 添加好友通知事件类
 *
 * @extends {NoticeEvent<OB11FriendAddEventPayload>}
 */
export class FriendAddEvent extends NoticeEvent<OB11FriendAddEventPayload> {
    constructor(bot: Bot, payload: OB11FriendAddEventPayload) {
        super(bot, payload);
    }

    getUserId(): string {
        return String(this.payload.user_id);
    }
}

/**
 * Onebot V11 群消息撤回通知事件类
 *
 * @extends {NoticeEvent<OB11GroupRecallEventPayload>}
 */
export class GroupRecallEvent extends GroupNoticeEvent<OB11GroupRecallEventPayload> {
    constructor(bot: Bot, payload: OB11GroupRecallEventPayload) {
        super(bot, payload);
    }

    getOperatorId(): string {
        return String(this.payload.operator_id);
    }

    getMessageId(): string {
        return this.payload.message_id;
    }
}

/**
 * Onebot V11 好友消息撤回通知事件类
 *
 * @extends {NoticeEvent<OB11FriendRecallEventPayload>}
 */
export class FriendRecallEvent extends NoticeEvent<OB11FriendRecallEventPayload> {
    constructor(bot: Bot, payload: OB11FriendRecallEventPayload) {
        super(bot, payload);
    }

    getMessageId(): string {
        return this.payload.message_id;
    }

    getUserId(): string {
        return String(this.payload.user_id);
    }
}

/**
 * Onebot V11 群戳一戳通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupPokeEventPayload>}
 */
export class GroupPokeEvent extends GroupNoticeEvent<OB11GroupPokeEventPayload> {
    constructor(bot: Bot, payload: OB11GroupPokeEventPayload) {
        super(bot, payload);
    }

    getTargetId(): string {
        return String(this.payload.target_id);
    }

    override mentioned(userId: string | number): boolean {
        return this.getTargetId() === String(userId);
    }

    override mentionedMe(): boolean {
        return this.mentioned(this.getSelfId());
    }

    getRawInfo<T = any>(): T | undefined {
        return this.payload.raw_info as T | undefined;
    }
}

/**
 * Onebot V11 群红包手气王通知事件类
 *
 * @extends {GroupNoticeEvent<OB11LuckyKingEventPayload>}
 */
export class LuckyKingEvent extends GroupNoticeEvent<OB11LuckyKingEventPayload> {
    constructor(bot: Bot, payload: OB11LuckyKingEventPayload) {
        super(bot, payload);
    }

    getTargetId(): string {
        return String(this.payload.target_id);
    }

    override mentioned(userId: string | number): boolean {
        return this.getTargetId() === String(userId);
    }

    override mentionedMe(): boolean {
        return this.mentioned(this.getSelfId());
    }
}

/**
 * Onebot V11 群荣誉称号通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupHonorEventPayload>}
 */
export class GroupHonorEvent extends GroupNoticeEvent<OB11GroupHonorEventPayload> {
    constructor(bot: Bot, payload: OB11GroupHonorEventPayload) {
        super(bot, payload);
    }

    getHonorType(): string {
        return this.payload.honor_type;
    }
}

/**
 * Onebot V11 群名片变更通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupCardEventPayload>}
 */
export class GroupCardEvent extends GroupNoticeEvent<OB11GroupCardEventPayload> {
    constructor(bot: Bot, payload: OB11GroupCardEventPayload) {
        super(bot, payload);
    }

    getNewCard(): string {
        return this.payload.card_new;
    }

    getOldCard(): string {
        return this.payload.card_old;
    }
}

/**
 * Onebot V11 群名称变更通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupNameEventPayload>}
 */
export class GroupNameEvent extends GroupNoticeEvent<OB11GroupNameEventPayload> {
    constructor(bot: Bot, payload: OB11GroupNameEventPayload) {
        super(bot, payload);
    }

    getNewName(): string {
        return this.payload.name_new;
    }
}

/**
 * Onebot V11 群头衔变更通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupTitleEventPayload>}
 */
export class GroupTitleEvent extends GroupNoticeEvent<OB11GroupTitleEventPayload> {
    constructor(bot: Bot, payload: OB11GroupTitleEventPayload) {
        super(bot, payload);
    }

    getTitle(): string {
        return this.payload.title;
    }
}

/**
 * Onebot V11 群精华消息通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupEssenceEventPayload>}
 */
export class GroupEssenceEvent
    extends GroupNoticeEvent<OB11GroupEssenceEventPayload>
    implements hasSender
{
    constructor(bot: Bot, payload: OB11GroupEssenceEventPayload) {
        super(bot, payload);
    }

    getOperatorId(): string {
        return String(this.payload.operator_id);
    }

    getSenderId(): string {
        return String(this.payload.sender_id);
    }

    getMessageId(): string {
        return this.payload.message_id;
    }

    isAdd(): boolean {
        return this.payload.sub_type === "add";
    }
}

/**
 * Onebot V11 群消息表情点赞通知事件类
 *
 * @extends {GroupNoticeEvent<OB11GroupMsgEmojiLikeEventPayload>}
 */
export class GroupMsgEmojiLikeEvent extends GroupNoticeEvent<OB11GroupMsgEmojiLikeEventPayload> {
    constructor(bot: Bot, payload: OB11GroupMsgEmojiLikeEventPayload) {
        super(bot, payload);
    }

    getMessageId(): string {
        return this.payload.message_id;
    }

    hasEmojiId(emojiId: string): boolean {
        return this.getLikes().some((like) => like.emoji_id === emojiId);
    }

    hasCountAbove(count: number): boolean {
        return this.getLikes().some((like) => like.count >= count);
    }

    hasTotalAbove(count: number): boolean {
        // 所有表情的点赞数之和超过指定值
        return (
            this.getLikes().reduce((sum, like) => sum + like.count, 0) >= count
        );
    }

    getLikes(): { emoji_id: string; count: number }[] {
        return this.payload.likes;
    }
}

/**
 * Onebot V11 好友戳一戳通知事件类
 *
 * @extends {NoticeEvent<OB11FriendPokeEventPayload>}
 */
export class FriendPokeEvent
    extends NoticeEvent<OB11FriendPokeEventPayload>
    implements Targetable, hasSender
{
    constructor(bot: Bot, payload: OB11FriendPokeEventPayload) {
        super(bot, payload);
    }

    getTargetId(): string {
        return String(this.payload.target_id);
    }

    getSenderId(): string {
        return String(this.payload.sender_id);
    }

    mentioned(userId: string | number): boolean {
        return this.getTargetId() === String(userId);
    }

    mentionedMe(): boolean {
        return this.mentioned(this.getSelfId());
    }

    getRawInfo<T = any>(): T | undefined {
        return this.payload.raw_info as T | undefined;
    }
}

/**
 * Onebot V11 个人资料点赞通知事件类
 *
 * @extends {NoticeEvent<OB11ProfileLikeEventPayload>}
 */
export class ProfileLikeEvent extends NoticeEvent<OB11ProfileLikeEventPayload> {
    constructor(bot: Bot, payload: OB11ProfileLikeEventPayload) {
        super(bot, payload);
    }

    getOperatorId(): string {
        return String(this.payload.operator_id);
    }

    getOperatorNick(): string {
        return this.payload.operator_nick;
    }

    getLikedTimes(): number {
        return this.payload.times;
    }
}

/**
 * Onebot V11 输入状态通知事件类
 *
 * @extends {NoticeEvent<OB11InputStatusEventPayload>}
 */
export class InputStatusEvent extends NoticeEvent<OB11InputStatusEventPayload> {
    constructor(bot: Bot, payload: OB11InputStatusEventPayload) {
        super(bot, payload);
    }

    getUserId(): string {
        return String(this.payload.user_id);
    }

    isUser(userId: string | number): boolean {
        return this.getUserId() === String(userId);
    }

    getStatusText(): string {
        return this.payload.status_text;
    }

    getEventType(): number {
        return this.payload.event_type;
    }

    getGroupId(): string | undefined {
        return this.payload.group_id
            ? String(this.payload.group_id)
            : undefined;
    }
}

/**
 * Onebot V11 机器人离线通知事件类
 *
 * @extends {NoticeEvent<OB11BotOfflineEventPayload>}
 */
export class BotOfflineEvent extends NoticeEvent<OB11BotOfflineEventPayload> {
    constructor(bot: Bot, payload: OB11BotOfflineEventPayload) {
        super(bot, payload);
    }

    getTag(): string {
        return this.payload.tag;
    }
    getMsg(): string {
        return this.payload.message;
    }
}
