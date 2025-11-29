import type {GetStatusResponse} from "@/model";
import {Sakiko, SakikoBaseEvent, SakikoMessageEvent, SakikoMetaEvent, SakikoNoticeEvent} from "@grouptogawa/sakiko";
import {SegmentType, Text, type Message, type SakikoAdapterOnebot} from ".";

/**
 * 这个文件里是各种 Onebot v11 事件的定义
 * 善用 Ctrl+F !
 */

// 事件上报类型
export enum PostType {
  MESSAGE = "message",
  NOTICE = "notice",
  REQUEST = "request",
  META_EVENT = "meta_event"
}

// 这里开始是 消息事件 MessageEvent 及其子类型的定义

// 消息类型
export enum MessageType {
  PRIVATE = "private",
  GROUP = "group"
}

// 私聊子类型
enum SubTypePrivate {
  FRIEND = "friend",
  GROUP = "group",
  OTHER = "other"
}

// 群聊子类型
enum SubTypeGroup {
  NORMAL = "normal",
  ANONYMOUS = "anonymous",
  NOTICE = "notice"
}

// 匿名用户信息
export interface GroupMessageAnonymous {
  id: number;
  name: string;
  flag: string;
}

// 发送者信息
export interface MessageSender {
  userId?: number;
  nickname?: string;
  card?: string;
  sex?: "male" | "female" | "unknown";
  age?: number;
  area?: string;
  level?: string;
  role?: "owner" | "admin" | "member";
  title?: string;
}

/**
 * Onebot v11 消息事件定义
 *
 * @template TSubType 私聊子类型或群聊子类型
 */
export class MessageEvent<TSubType extends SubTypePrivate | SubTypeGroup> extends SakikoMessageEvent {
  private adapter: SakikoAdapterOnebot;

  time: number;
  override selfId: string;
  postType: PostType;
  messageType: MessageType;
  subType: TSubType;
  messageId: number;
  userId: number;
  message: Message;
  rawMessage: string;
  font: number;
  sender: MessageSender;

  constructor(
    sakiko: Sakiko,
    adapter: SakikoAdapterOnebot,
    time: number,
    selfId: string,
    messageType: MessageType,
    subType: TSubType,
    messageId: number,
    userId: number,
    message: Message,
    rawMessage: string,
    font: number,
    sender: MessageSender
  ) {
    super(sakiko);
    this.adapter = adapter;
    this.time = time;
    this.selfId = selfId;
    this.postType = PostType.MESSAGE;
    this.messageType = messageType;
    this.subType = subType;
    this.messageId = messageId;
    this.userId = userId;
    this.message = message;
    this.rawMessage = rawMessage;
    this.font = font;
    this.sender = sender;
  }

  override getPlainText(): string {
    // 去掉所有text之外的元素
    return this.message
      .filter(item => item.type === SegmentType.TEXT)
      .map(item => (item as Text).data.text)
      .join("");
  }

  override toMe(): boolean {
    return false;
  }

  getAdapter(): SakikoAdapterOnebot {
    return this.adapter;
  }
}

/**
 * Onebot v11 私聊消息事件定义
 * @extends MessageEvent<SubTypePrivate>
 */
export class PrivateMessageEvent extends MessageEvent<SubTypePrivate> {
  targetId?: number;
  tempSource?: number;

  constructor(
    sakiko: Sakiko,
    adapter: SakikoAdapterOnebot,
    time: number,
    selfId: string,
    messageType: MessageType,
    subType: SubTypePrivate,
    messageId: number,
    userId: number,
    message: any,
    rawMessage: string,
    font: number,
    sender: MessageSender,
    targetId?: number,
    tempSource?: number
  ) {
    super(sakiko, adapter, time, selfId, messageType, subType, messageId, userId, message, rawMessage, font, sender);
    this.targetId = targetId;
    this.tempSource = tempSource;
  }
}

/**
 * Onebot v11 群聊消息事件定义
 * @extends MessageEvent<SubTypeGroup>
 */
export class GroupMessageEvent extends MessageEvent<SubTypeGroup> {
  groupId: number;
  anonymous: GroupMessageAnonymous | null;

  constructor(
    sakiko: Sakiko,
    adapter: SakikoAdapterOnebot,
    time: number,
    selfId: string,
    messageType: MessageType,
    subType: SubTypeGroup,
    messageId: number,
    groupId: number,
    userId: number,
    anonymous: GroupMessageAnonymous | null,
    message: any,
    rawMessage: string,
    font: number,
    sender: MessageSender
  ) {
    super(sakiko, adapter, time, selfId, messageType, subType, messageId, userId, message, rawMessage, font, sender);
    this.groupId = groupId;
    this.anonymous = anonymous;
  }
}

// 这里开始是 通知事件 NoticeEvent 及其子类型的定义

// 通知类型
export enum NoticeType {
  GROUP_UPLOAD = "group_upload",
  GROUP_ADMIN = "group_admin",
  GROUP_DECREASE = "group_decrease",
  GROUP_INCREASE = "group_increase",
  GROUP_BAN = "group_ban",
  FRIEND_ADD = "friend_add",
  GROUP_RECALL = "group_recall",
  FRIEND_RECALL = "friend_recall",
  GROUP_MSG_EMOJI_LIKE = "group_msg_emoji_like",
  ESSENCE = "essence",
  GROUP_CARD = "group_card",

  NOTIFY = "notify",

  OFFLINE = "bot_offline"
}

/**
 * Onebot v11 通知事件定义
 * @extends SakikoNoticeEvent
 */
export class NoticeEvent extends SakikoNoticeEvent {
  private adapter: SakikoAdapterOnebot;

  time: number;
  override selfId: string;
  postType: PostType;
  noticeType: NoticeType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, noticeType: NoticeType) {
    super(sakiko);
    this.adapter = adapter;
    this.time = time;
    this.selfId = selfId;
    this.postType = PostType.NOTICE;
    this.noticeType = noticeType;
  }

  getAdapter(): SakikoAdapterOnebot {
    return this.adapter;
  }
}

/**
 * Onebot v11 群通知事件基类定义
 * @extends NoticeEvent
 */
export class GroupNoticeEvent extends NoticeEvent {
  groupId: number;
  userId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, noticeType: NoticeType, groupId: number, userId: number) {
    super(sakiko, adapter, time, selfId, noticeType);
    this.groupId = groupId;
    this.userId = userId;
  }
}

// 群文件上传信息
interface GroupUploadFile {
  id: string;
  name: string;
  size: number;
  busid?: number;
}

/**
 * Onebot v11 群文件上传通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupUploadNoticeEvent extends GroupNoticeEvent {
  file: GroupUploadFile;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, file: GroupUploadFile) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_UPLOAD, groupId, userId);
    this.file = file;
  }
}

// 群管理员变更子类型
enum GroupAdminSubType {
  SET = "set",
  UNSET = "unset"
}

/**
 * Onebot v11 群管理员变更通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupAdminNoticeEvent extends GroupNoticeEvent {
  subType: GroupAdminSubType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, subType: GroupAdminSubType) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_ADMIN, groupId, userId);
    this.subType = subType;
  }
}

// 群成员减少子类型
enum GroupDecreaseSubType {
  KICK = "kick",
  LEAVE = "leave",
  KICK_ME = "kick_me"
}

/**
 * Onebot v11 群成员减少通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupDecreaseNoticeEvent extends GroupNoticeEvent {
  operatorId: number;
  subType: GroupDecreaseSubType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, operatorId: number, subType: GroupDecreaseSubType) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_DECREASE, groupId, userId);
    this.operatorId = operatorId;
    this.subType = subType;
  }
}

// 群成员增加子类型
export enum GroupIncreaseSubType {
  APPROVE = "approve",
  INVITE = "invite"
}

/**
 * Onebot v11 群成员增加通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupIncreaseNoticeEvent extends GroupNoticeEvent {
  operatorId: number;
  subType: GroupIncreaseSubType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, operatorId: number, subType: GroupIncreaseSubType) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_INCREASE, groupId, userId);
    this.operatorId = operatorId;
    this.subType = subType;
  }
}

// 群成员禁言子类型
enum GroupBanSubType {
  BAN = "ban",
  LIFT_BAN = "lift_ban"
}

/**
 * Onebot v11 群成员禁言通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupBanNoticeEvent extends GroupNoticeEvent {
  operatorId: number;
  duration: number;
  subType: GroupBanSubType;
  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, operatorId: number, duration: number, subType: GroupBanSubType) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_BAN, groupId, userId);
    this.operatorId = operatorId;
    this.subType = subType;
    this.duration = duration;
  }
}

/**
 * Onebot v11 好友添加通知事件定义
 * @extends NoticeEvent
 */
export class FriendAddNoticeEvent extends NoticeEvent {
  userId: number;
  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, userId: number) {
    super(sakiko, adapter, time, selfId, NoticeType.FRIEND_ADD);
    this.userId = userId;
  }
}

/**
 * Onebot v11 群消息撤回通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupRecallNoticeEvent extends GroupNoticeEvent {
  operatorId: number;
  messageId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, operatorId: number, messageId: number, groupId: number, userId: number) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_RECALL, groupId, userId);
    this.operatorId = operatorId;
    this.messageId = messageId;
  }
}

/**
 * Onebot v11 好友消息撤回通知事件定义
 * @extends NoticeEvent
 */
export class FriendRecallNoticeEvent extends NoticeEvent {
  userId: number;
  messageId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, userId: number, messageId: number) {
    super(sakiko, adapter, time, selfId, NoticeType.FRIEND_RECALL);
    this.userId = userId;
    this.messageId = messageId;
  }
}

// 提醒子类型
export enum NotifySubType {
  POKE = "poke",
  PROFILE_LIKE = "profile_like",
  INPUT_STATUS = "input_status",
  LUCKY_KING = "lucky_king",
  HONOR = "honor",
  GROUP_NAME = "group_name",
  TITLE = "title"
}

/**
 * Onebot v11 提醒事件定义
 * @extends NoticeEvent
 */
export class NotifyNoticeEvent extends NoticeEvent {
  subType: NotifySubType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, subType: NotifySubType) {
    super(sakiko, adapter, time, selfId, NoticeType.NOTIFY);
    this.subType = subType;
  }
}

/**
 * Onebot v11 戳一戳通知事件定义
 * @extends NotifyNoticeEvent
 */
export class PokeNoticeEvent extends NotifyNoticeEvent {
  userId: number;
  targetId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, userId: number, targetId: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.POKE);
    this.userId = userId;
    this.targetId = targetId;
  }
}

/**
 * Onebot v11 好友戳一戳通知事件定义
 * @extends PokeNoticeEvent
 */
export class FriendPokeNoticeEvent extends PokeNoticeEvent {
  rawInfo: unknown;
  senderId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, userId: number, targetId: number, rawInfo: unknown, senderId: number) {
    super(sakiko, adapter, time, selfId, userId, targetId);
    this.rawInfo = rawInfo;
    this.senderId = senderId;
  }
}

/**
 * Onebot v11 群戳一戳通知事件定义
 * @extends PokeNoticeEvent
 */
export class GroupPokeNoticeEvent extends PokeNoticeEvent {
  rawInfo: unknown;
  groupId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, userId: number, targetId: number, rawInfo: unknown, groupId: number) {
    super(sakiko, adapter, time, selfId, userId, targetId);
    this.rawInfo = rawInfo;
    this.groupId = groupId;
  }
}

/**
 * Onebot v11 手气王通知事件定义
 * @extends NotifyNoticeEvent
 */
export class LuckyKingNoticeEvent extends NotifyNoticeEvent {
  groupId: number;
  userId: number;
  targetId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, targetId: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.LUCKY_KING);
    this.groupId = groupId;
    this.userId = userId;
    this.targetId = targetId;
  }
}

export enum HonorType {
  TALKATIVE = "talkative",
  PERFORMER = "performer",
  LEGEND = "legend",
  STRONG_NEWBIE = "strong_newbie",
  EMOTION = "emotion",
  ALL = "all"
}

/**
 * Onebot v11 群荣誉变更通知事件定义
 * @extends NotifyNoticeEvent
 */
export class HonorNoticeEvent extends NotifyNoticeEvent {
  groupId: number;
  honorType: HonorType;
  userId: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, honorType: HonorType, userId: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.HONOR);
    this.groupId = groupId;
    this.honorType = honorType;
    this.userId = userId;
  }
}

interface MsgEmojiLike {
  emoji_id: string; // 表情 ID
  count: number; // 回应数量
}

/**
 * Onebot v11 群消息表情回应通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupMsgEmojiLikeNoticeEvent extends GroupNoticeEvent {
  messageId: number;
  likes: MsgEmojiLike[];

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, messageId: number, likes: MsgEmojiLike[]) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_MSG_EMOJI_LIKE, groupId, userId);
    this.messageId = messageId;
    this.likes = likes;
  }
}

enum EssenceSubType {
  ADD = "add",
  DELETE = "delete"
}

/** * Onebot v11 精华消息通知事件定义
 * @extends GroupNoticeEvent
 */
export class GroupEssenceNoticeEvent extends GroupNoticeEvent {
  messageId: number;
  senderId: number;
  operatorId: number;
  subType: EssenceSubType;

  constructor(
    sakiko: Sakiko,
    adapter: SakikoAdapterOnebot,
    time: number,
    selfId: string,
    groupId: number,
    userId: number,
    messageId: number,
    senderId: number,
    operatorId: number,
    subType: EssenceSubType
  ) {
    super(sakiko, adapter, time, selfId, NoticeType.ESSENCE, groupId, userId);
    this.messageId = messageId;
    this.senderId = senderId;
    this.operatorId = operatorId;
    this.subType = subType;
  }
}

/**
 * Onebot v11 群名片变更通知事件定义
 * @extends NoticeEvent
 */
export class GroupCardNoticeEvent extends GroupNoticeEvent {
  cardNew: string;
  cardOld: string;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, groupId: number, userId: number, cardNew: string, cardOld: string) {
    super(sakiko, adapter, time, selfId, NoticeType.GROUP_CARD, groupId, userId);
    this.cardNew = cardNew;
    this.cardOld = cardOld;
  }
}

/**
 * Onebot v11 群名变更通知事件定义
 * @extends NotifyNoticeEvent
 */
export class GroupNameNoticeEvent extends NotifyNoticeEvent {
  groupId: number;
  userId: number;
  nameNew: string;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, nameNew: string, groupId: number, userId: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.GROUP_NAME);
    this.nameNew = nameNew;
    this.groupId = groupId;
    this.userId = userId;
  }
}

/**
 * Onebot v11 群头衔变更通知事件定义
 * @extends NotifyNoticeEvent
 */
export class GroupTitleNoticeEvent extends NotifyNoticeEvent {
  groupId: number;
  userId: number;
  title: string;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, title: string, groupId: number, userId: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.TITLE);
    this.groupId = groupId;
    this.userId = userId;
    this.title = title;
  }
}

/**
 * Onebot v11 资料点赞通知事件定义
 * @extends NotifyNoticeEvent
 */
export class ProfileLikeNoticeEvent extends NotifyNoticeEvent {
  operatorId: number;
  operatorNick: string;
  times: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, operatorId: number, operatorNick: string, times: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.PROFILE_LIKE);
    this.operatorId = operatorId;
    this.operatorNick = operatorNick;
    this.times = times;
  }
}

/**
 * Onebot v11 输入状态通知事件定义
 * @extends NotifyNoticeEvent
 */
export class InputStatusNoticeEvent extends NotifyNoticeEvent {
  statusText: string;
  eventType: number;
  userId: number;
  groupId?: number;
  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, statusText: string, eventType: number, userId: number, groupId?: number) {
    super(sakiko, adapter, time, selfId, NotifySubType.INPUT_STATUS);
    this.statusText = statusText;
    this.eventType = eventType;
    this.userId = userId;
    this.groupId = groupId;
  }
}

/**
 * Onebot v11 离线通知事件定义
 * @extends NoticeEvent
 */
export class BotOfflineNoticeEvent extends NoticeEvent {
  userId: number;
  tag: string;
  message: string;

  side: "protocol" | "adapter" = "protocol";

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, userId: number, tag: string, message: string, side?: "protocol" | "adapter") {
    super(sakiko, adapter, time, selfId, NoticeType.OFFLINE);
    this.userId = userId;
    this.tag = tag;
    this.message = message;
    if (side) {
      this.side = side;
    }
  }
}

// 这里开始是 请求事件 RequestEvent 及其子类型的定义

export enum RequestType {
  FRIEND = "friend",
  GROUP = "group"
}

/**
 * Onebot v11 请求事件定义
 * @extends SakikoBaseEvent
 */
export class RequestEvent extends SakikoBaseEvent {
  private adapter: SakikoAdapterOnebot;

  time: number;
  override selfId: string;
  postType: PostType;
  requestType: RequestType;
  flag: string;
  userId: number;
  comment: string;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, requestType: RequestType, flag: string, userId: number, comment: string) {
    super(sakiko);
    this.adapter = adapter;
    this.time = time;
    this.selfId = selfId;
    this.postType = PostType.REQUEST;
    this.requestType = requestType;
    this.flag = flag;
    this.userId = userId;
    this.comment = comment;
  }

  getAdapter() {
    return this.adapter;
  }
}

/**
 * Onebot v11 好友请求事件定义
 * @extends RequestEvent
 */
export class FriendRequestEvent extends RequestEvent {
  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, requestType: RequestType, flag: string, userId: number, comment: string) {
    super(sakiko, adapter, time, selfId, requestType, flag, userId, comment);
  }
}

// 群请求子类型
enum GroupRequestSubType {
  ADD = "add",
  INVITE = "invite"
}

/**
 * Onebot v11 群请求事件定义
 * @extends RequestEvent
 */
export class GroupRequestEvent extends RequestEvent {
  subType: GroupRequestSubType;
  groupId: number;

  constructor(
    sakiko: Sakiko,
    adapter: SakikoAdapterOnebot,
    time: number,
    selfId: string,
    requestType: RequestType,
    flag: string,
    userId: number,
    comment: string,
    subType: GroupRequestSubType,
    groupId: number
  ) {
    super(sakiko, adapter, time, selfId, requestType, flag, userId, comment);
    this.subType = subType;
    this.groupId = groupId;
  }
}

// 这里开始是 元事件 MetaEvent 及其子类型的定义

// 元事件类型
export enum MetaEventType {
  LIFECYCLE = "lifecycle",
  HEARTBEAT = "heartbeat"
}

/**
 * Onebot v11 元事件定义
 * @extends SakikoMetaEvent
 */
export class MetaEvent extends SakikoMetaEvent {
  private adapter: SakikoAdapterOnebot;

  time: number;
  override selfId: string;
  postType: PostType;
  metaEventType: MetaEventType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, metaEventType: MetaEventType) {
    super(sakiko);
    this.adapter = adapter;
    this.time = time;
    this.selfId = selfId;
    this.postType = PostType.META_EVENT;
    this.metaEventType = metaEventType;
  }

  getAdapter() {
    return this.adapter;
  }
}

// 生命周期子类型
enum LifecycleMetaEventSubType {
  CONNECT = "connect",
  ENABLE = "enable",
  DISABLE = "disable"
}

/**
 * Onebot v11 生命周期元事件定义
 * @extends MetaEvent
 */
export class LifecycleMetaEvent extends MetaEvent {
  subType: LifecycleMetaEventSubType;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, metaEventType: MetaEventType, subType: LifecycleMetaEventSubType) {
    super(sakiko, adapter, time, selfId, metaEventType);
    this.subType = subType;
  }
}

/**
 * Onebot v11 心跳元事件定义
 * @extends MetaEvent
 *
 */
export class HeartbeatMetaEvent extends MetaEvent {
  status: GetStatusResponse;
  interval: number;

  constructor(sakiko: Sakiko, adapter: SakikoAdapterOnebot, time: number, selfId: string, metaEventType: MetaEventType, status: GetStatusResponse, interval: number) {
    super(sakiko, adapter, time, selfId, metaEventType);
    this.status = status;
    this.interval = interval;
  }
}

/**
 * Onebot v11 全部事件类型的联合定义
 */
export type OnebotV11EventLike = MessageEvent<any> | NoticeEvent | RequestEvent | MetaEvent;
