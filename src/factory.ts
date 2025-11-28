import {
  FriendAddNoticeEvent,
  FriendPokeNoticeEvent,
  FriendRecallNoticeEvent,
  FriendRequestEvent,
  GroupAdminNoticeEvent,
  GroupBanNoticeEvent,
  GroupCardNoticeEvent,
  GroupDecreaseNoticeEvent,
  GroupEssenceNoticeEvent,
  GroupIncreaseNoticeEvent,
  GroupMessageEvent,
  GroupMsgEmojiLikeNoticeEvent,
  GroupNameNoticeEvent,
  GroupPokeNoticeEvent,
  GroupRecallNoticeEvent,
  GroupRequestEvent,
  GroupTitleNoticeEvent,
  GroupUploadNoticeEvent,
  HeartbeatMetaEvent,
  HonorNoticeEvent,
  InputStatusNoticeEvent,
  LifecycleMetaEvent,
  LuckyKingNoticeEvent,
  MessageType,
  MetaEventType,
  NoticeType,
  NotifySubType,
  PostType,
  PrivateMessageEvent,
  ProfileLikeNoticeEvent,
  RequestType
} from "@/event";
import type {Sakiko, SakikoBaseEvent} from "@grouptogawa/sakiko";
import {Message, type SakikoAdapterOnebot} from ".";

// 各个类型事件的处理函数映射表
// 我知道你很好奇为什么这里不用 switch
// 我写了一大半了才想起来 js/ts 里 switch 会自动优化成表的，想装b被制裁了说是
// 就当这个写法能提供1%的优化吧，虽然实际上不是负优化就不错了，别骂我

// 用于处理 message 类型事件的处理函数映射表
const messageEventDataHandler: Record<string, (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => SakikoBaseEvent> = {
  // 私聊消息
  [MessageType.PRIVATE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new PrivateMessageEvent(
      sakiko,
      adapter,
      obj.time,
      obj.self_id,
      obj.message_type,
      obj.sub_type,
      obj.message_id,
      obj.user_id,
      Message.fromArray(obj.message),
      obj.raw_message,
      obj.font,
      obj.sender,
      obj.target_id,
      obj.temp_source
    );
  },
  // 群聊消息
  [MessageType.GROUP]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupMessageEvent(
      sakiko,
      adapter,
      obj.time,
      obj.self_id,
      obj.message_type,
      obj.sub_type,
      obj.message_id,
      obj.group_id,
      obj.user_id,
      obj.anonymous,
      Message.fromArray(obj.message),
      obj.raw_message,
      obj.font,
      obj.sender
    );
  }
};

// 用于处理 notify 类型通知事件的处理函数映射表
const notifyNoticeEventDataHandler: Record<string, (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => SakikoBaseEvent> = {
  // 戳一戳通知
  [NotifySubType.POKE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    // 检查是群聊的戳一戳还是私聊的戳一戳
    if (obj.sender_id) {
      // 私聊
      return new FriendPokeNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.user_id, obj.target_id, obj.raw_info, obj.sender_id);
    } else if (obj.group_id) {
      // 群聊
      return new GroupPokeNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.user_id, obj.target_id, obj.raw_info, obj.group_id);
    } else {
      throw `invalid poke notify notice event data: ${JSON.stringify(obj)}`;
    }
  },
  // 个人资料点赞通知
  [NotifySubType.PROFILE_LIKE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new ProfileLikeNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.operator_id, obj.operator_nick, obj.times);
  },
  // 输入状态通知
  [NotifySubType.INPUT_STATUS]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new InputStatusNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.status_text, obj.event_type, obj.user_id, obj.group_id);
  },
  // 群聊红包手气王通知
  [NotifySubType.LUCKY_KING]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new LuckyKingNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.target_id);
  },
  // 群荣誉变更通知
  [NotifySubType.HONOR]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new HonorNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.honor_type, obj.user_id);
  },
  // 群名片变更通知
  [NotifySubType.GROUP_NAME]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupNameNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.name_new, obj.group_id, obj.user_id);
  },
  // 群头衔变更通知
  [NotifySubType.TITLE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupTitleNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.title, obj.group_id, obj.user_id);
  }
};

// 用于处理未注册的 notify notice_type 的处理函数
const defaultNotifyNoticeHandler = (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
  throw `unhandled notify notice type "${obj.sub_type}" in Onebot v11 notice event: ${JSON.stringify(obj)}`;
};

// 用于处理 notice 类型事件的处理函数映射表
const noticeEventDataHandler: Record<string, (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => SakikoBaseEvent> = {
  // 群文件上传通知
  [NoticeType.GROUP_UPLOAD]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupUploadNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.file);
  },
  // 群管理员变更通知
  [NoticeType.GROUP_ADMIN]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupAdminNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.sub_type);
  },
  // 群成员减少通知
  [NoticeType.GROUP_DECREASE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupDecreaseNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.operator_id, obj.sub_type);
  },
  // 群成员增加通知
  [NoticeType.GROUP_INCREASE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupIncreaseNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.operator_id, obj.sub_type);
  },
  // 群成员禁言通知
  [NoticeType.GROUP_BAN]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupBanNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.operator_id, obj.duration, obj.sub_type);
  },
  // 好友增加通知
  [NoticeType.FRIEND_ADD]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new FriendAddNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.user_id);
  },
  // 群消息撤回通知
  [NoticeType.GROUP_RECALL]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupRecallNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.operator_id, obj.message_id, obj.group_id, obj.user_id);
  },
  // 好友消息撤回通知
  [NoticeType.FRIEND_RECALL]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new FriendRecallNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.user_id, obj.message_id);
  },
  // 群表情表态通知
  [NoticeType.GROUP_MSG_EMOJI_LIKE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupMsgEmojiLikeNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.message_id, obj.likes);
  },
  // 群精华消息通知
  [NoticeType.ESSENCE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupEssenceNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.message_id, obj.sender_id, obj.operator_id, obj.sub_type);
  },
  // 群名片变更通知
  [NoticeType.GROUP_CARD]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupCardNoticeEvent(sakiko, adapter, obj.time, obj.self_id, obj.group_id, obj.user_id, obj.card_new, obj.card_old);
  },
  // 提醒类型的通知，这部分通知有自己的处理器
  [NoticeType.NOTIFY]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return (notifyNoticeEventDataHandler[obj.sub_type] || defaultNotifyNoticeHandler)(sakiko, adapter, obj);
  }
};

// 用于处理 request 类型事件的处理函数映射表
const requestEventDataHandler: Record<string, (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => SakikoBaseEvent> = {
  // 好友请求
  [RequestType.FRIEND]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new FriendRequestEvent(sakiko, adapter, obj.time, obj.self_id, obj.request_type, obj.flag, obj.user_id, obj.comment);
  },
  // 群请求
  [RequestType.GROUP]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new GroupRequestEvent(sakiko, adapter, obj.time, obj.self_id, obj.request_type, obj.flag, obj.user_id, obj.comment, obj.sub_type, obj.group_id);
  }
};

// 用于处理 meta_event 类型事件的处理函数映射表
const metaEventDataHandler: Record<string, (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => SakikoBaseEvent> = {
  // 生命周期事件
  [MetaEventType.LIFECYCLE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new LifecycleMetaEvent(sakiko, adapter, obj.time, obj.self_id, obj.meta_event_type, obj.sub_type);
  },
  // 心跳事件
  [MetaEventType.HEARTBEAT]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
    return new HeartbeatMetaEvent(sakiko, adapter, obj.time, obj.self_id, obj.meta_event_type, obj.status, obj.interval);
  }
};

// 用于处理未注册的 message_type 的处理函数
const defaultMessageHandler = (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
  throw `unhandled message type "${obj.message_type}" in Onebot v11 message event: ${JSON.stringify(obj)}`;
};

// 用于处理未注册的 notice_type 的处理函数
const defaultNoticeHandler = (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
  throw `unhandled notice type "${obj.notice_type}" in Onebot v11 notice event: ${JSON.stringify(obj)}`;
};

// 用于处理未注册的 request_type 的处理函数
const defaultRequestHandler = (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
  throw `unhandled request type "${obj.request_type}" in Onebot v11 request event: ${JSON.stringify(obj)}`;
};

// 用于处理未注册的 meta_event_type 的处理函数
const defaultMetaEventHandler = (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
  throw `unhandled meta_event type "${obj.meta_event_type}" in Onebot v11 meta_event: ${JSON.stringify(obj)}`;
};

// 统一中转各个 post_type 的对象到各自的处理函数
const eventDataHandler: Record<string, (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => SakikoBaseEvent> = {
  [PostType.MESSAGE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => {
    return (messageEventDataHandler[obj.message_type] || defaultMessageHandler)(sakiko, adapter, obj);
  },
  [PostType.NOTICE]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => {
    return (noticeEventDataHandler[obj.notice_type] || defaultNoticeHandler)(sakiko, adapter, obj);
  },
  [PostType.REQUEST]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => {
    return (requestEventDataHandler[obj.request_type] || defaultRequestHandler)(sakiko, adapter, obj);
  },
  [PostType.META_EVENT]: (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any) => {
    return (metaEventDataHandler[obj.meta_event_type] || defaultMetaEventHandler)(sakiko, adapter, obj);
  }
};

// 用于处理未注册的 post_type 的处理函数
const defaultHandler = (sakiko: Sakiko, adapter: SakikoAdapterOnebot, obj: any): SakikoBaseEvent => {
  throw `unhandled post_type "${obj.post_type}" in Onebot v11 event: ${JSON.stringify(obj)}`;
};

/**
 * Onebot v11 事件工厂函数
 *
 * 用于将传入的数据解析为对应的事件对象
 * @param data
 */
export function eventFactory(sakiko: Sakiko, adapter: SakikoAdapterOnebot, data: string | Buffer<ArrayBufferLike> | ArrayBuffer | Buffer<ArrayBufferLike>[]) {
  // 把接收到的数据直接用json解析成对象
  let obj: {time: number; self_id: string; post_type: string};
  try {
    obj = JSON.parse(data.toString());
  } catch (e) {
    throw `received data is not a valid JSON object: ${data.toString()}`;
  }
  // 检查对象是否属于事件结构
  if (!obj.time || !obj.self_id || !obj.post_type) {
    // 不满足事件结构，直接退出处理流程
    return;
  }

  // 通过 post_type 字段区分事件类型并调用相应的处理函数，见这个函数前面的定义
  return (eventDataHandler[obj.post_type] || defaultHandler)(sakiko, adapter, obj);
}
