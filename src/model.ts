import {randomUUID} from "crypto";
import type {Message} from "./message";
import {MessageType, type MessageSender, type GroupMessageAnonymous, GroupIncreaseSubType, HonorType} from "./event";

/**
 * Onebot v11 API 请求参数接口约束
 */
export interface IAPIRequest {}

/**
 * Onebot v11 API 响应参数接口约束
 */
export interface IAPIResponse {}

export class WebSocketMessageRequest {
  action: string;
  params: IAPIRequest;
  echo: string;

  constructor(action: string, params: IAPIRequest, echo: string) {
    this.action = action;
    this.params = params;
    this.echo = echo;
  }

  toString() {
    return JSON.stringify(this);
  }
}

/**
 * Onebot v11 `send_private_msg` 发送私聊消息
 */
export interface SendPrivateMsgRequest extends IAPIRequest {
  user_id: number;
  message: Message;
  auto_escape?: boolean;
}

export interface SendPrivateMsgResponse extends IAPIResponse {
  message_id: number;
}

/**
 * Onebot v11 `send_group_msg` 发送群消息
 */
export interface SendGroupMsgRequest extends IAPIRequest {
  group_id: number;
  message: Message;
  auto_escape?: boolean;
}

export interface SendGroupMsgResponse extends IAPIResponse {
  message_id: number;
}

/**
 * Onebot v11 `send_msg` 发送消息
 */
export interface SendMsgRequest extends IAPIRequest {
  message_type: MessageType;
  user_id?: number;
  group_id?: number;
  message: Message;
  auto_escape?: boolean;
}

export interface SendMsgResponse extends IAPIResponse {
  message_id: number;
}

/**
 * Onebot v11 `delete_msg` 撤回消息
 */
export interface DeleteMsgRequest extends IAPIRequest {
  message_id: number;
}

export interface DeleteMsgResponse extends IAPIResponse {}

/**
 * Onebot v11 `get_msg` 获取消息
 */
export interface GetMsgRequest extends IAPIRequest {
  message_id: number;
}

export interface GetMsgResponse extends IAPIResponse {
  time: number;
  message_type: MessageType;
  message_id: number;
  real_id: number;
  sender: MessageSender;
  message: Message;
}

/**
 * Onebot v11 `get_forward_msg` 获取合并转发消息
 */
export interface GetForwardMsgRequest extends IAPIRequest {
  id: number;
}

export interface GetForwardMsgResponse extends IAPIResponse {
  message: Message;
}

/**
 * Onebot v11 `send_like` 发送好友赞
 */
export interface SendLikeRequest extends IAPIRequest {
  user_id: number;
  times: number;
}

/**
 * Onebot v11 `set_group_kick` 群组踢人
 */
export interface SetGroupKickRequest extends IAPIRequest {
  group_id: number;
  user_id: number;
  reject_add_request: boolean;
}

/**
 * Onebot v11 `set_group_ban` 群组单人禁言
 */
export interface SetGroupBanResponse extends IAPIResponse {
  group_id: number;
  user_id: number;
  duration: number;
}

/**
 * Onebot v11 `set_group_anonymous_ban` 群组匿名用户禁言
 */
export interface SetGroupAnonymousBanRequest extends IAPIRequest {
  group_id: number;
  anonymous?: GroupMessageAnonymous;
  anonymous_flag?: string;
  flag?: string;
  duration: number;
}

/**
 * Onebot v11 `set_group_whole_ban` 群组全员禁言
 */
export interface SetGroupWholeBanRequest extends IAPIRequest {
  group_id: number;
  enable: boolean;
}

/**
 * Onebot v11 `set_group_admin` 群组设置管理员
 */
export interface SetGroupAdminRequest extends IAPIRequest {
  group_id: number;
  user_id: number;
  enable: boolean;
}

/**
 * Onebot v11 `set_group_anonymous` 群组匿名
 */
export interface SetGroupAnonymousRequest extends IAPIRequest {
  group_id: number;
  enable: boolean;
}

/**
 * Onebot v11 `set_group_card` 设置群名片（群备注）
 */
export interface SetGroupCardRequest extends IAPIRequest {
  group_id: number;
  user_id: number;
  card: string;
}

/**
 * Onebot v11 `set_group_name` 设置群名
 */
export interface SetGroupNameRequest extends IAPIRequest {
  group_id: number;
  group_name: string;
}

/**
 * Onebot v11 `set_group_leave` 退出群组
 */
export interface SetGroupLeaveRequest extends IAPIRequest {
  group_id: number;
  is_dismiss: boolean;
}

/**
 * Onebot v11 `set_group_special_title` 设置群组专属头衔
 */
export interface SetGroupSpecialTitleRequest extends IAPIRequest {
  group_id: number;
  user_id: number;
  special_title: string;
  duration: number;
}

/**
 * Onebot v11 `set_friend_add_request` 处理加好友请求
 */
export interface SetFriendAddRequestRequest extends IAPIRequest {
  flag: string;
  approve: boolean;
  remark: string;
}

/**
 * Onebot v11 `set_group_add_request` 处理加群请求／邀请
 */
export interface SetGroupAddRequestRequest extends IAPIRequest {
  flag: string;
  sub_type?: GroupIncreaseSubType;
  type?: GroupIncreaseSubType;
  approve: boolean;
  reason?: string;
}

/**
 * Onebot v11 `get_login_info` 获取登录号信息
 */
export interface GetLoginInfoResponse extends IAPIResponse {
  user_id: number;
  nickname: string;
}

/**
 * Onebot v11 `get_stranger_info` 获取陌生人信息
 */
export interface GetStrangerInfoRequest extends IAPIRequest {
  user_id: number;
  no_cache?: boolean;
}

export interface GetStrangerInfoResponse extends IAPIResponse {
  user_id: number;
  nickname: string;
  sex: string;
  age: number;
}

/**
 * Onebot v11 `get_friend_list` 获取好友列表
 */
export interface GetFriendListResponse
  extends IAPIResponse,
    Array<{
      user_id: number;
      nickname: string;
      remark: string;
    }> {}

/**
 * Onebot v11 `get_group_info` 获取群信息
 */
export interface GetGroupInfoRequest extends IAPIRequest {
  group_id: number;
  no_cache?: boolean;
}

export interface GetGroupInfoResponse extends IAPIResponse {
  group_id: number;
  group_name: string;
  group_count: number;
  max_member_count: number;
}

/**
 * Onebot v11 `get_group_list` 获取群列表
 */
export interface GetGroupListResponse
  extends IAPIResponse,
    Array<{
      group_id: number;
      group_name: string;
      member_count: number;
      max_member_count: number;
    }> {}

/**
 * Onebot v11 `get_group_member_info` 获取群成员信息
 */
export interface GetGroupMemberInfoRequest extends IAPIRequest {
  group_id: number;
  user_id: number;
  no_cache?: boolean;
}

export interface GetGroupMemberInfoResponse extends IAPIResponse {
  group_id: number;
  user_id: number;
  nickname: string;
  card: string;
  sex: string;
  age: number;
  area: string;
  join_time: number;
  last_sent_time: number;
  level: string;
  role: string;
  unfriendly: boolean;
  title: string;
  title_expire_time: number;
  card_changeable: boolean;
}

/**
 * Onebot v11 `get_group_member_list` 获取群成员列表
 */
export interface GetGroupMemberListRequest extends IAPIRequest {
  group_id: number;
}

export interface GetGroupMemberListResponse
  extends IAPIResponse,
    Array<{
      group_id: number;
      user_id: number;
      nickname: string;
      card: string;
      sex: string;
      age: number;
      area: string;
      join_time: number;
      last_sent_time: number;
      level: string;
      role: string;
      unfriendly: boolean;
      title: string;
      title_expire_time: number;
      card_changeable: boolean;
    }> {}

/**
 * Onebot v11 `get_group_honor_info` 获取群荣誉信息
 */
export interface GetGroupHonorInfoRequest extends IAPIRequest {
  group_id: number;
  type: HonorType;
}

export interface GetGroupHonorInfoResponse extends IAPIResponse {
  group_id: number;
  current_talkative: {
    user_id: number;
    nickname: string;
    avatar: string;
    day_count: number;
  };
  talkative_list: Array<{
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }>;
  performer_list: Array<{
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }>;
  legend_list: Array<{
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }>;
  strong_newbie_list: Array<{
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }>;
  emotion_list: Array<{
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }>;
}

/**
 * Onebot v11 `get_cookies` 获取 Cookies
 */
export interface GetCookiesRequest extends IAPIRequest {
  domain: string;
}

export interface GetCookiesResponse extends IAPIResponse {
  cookies: string;
}

/**
 * Onebot v11 `get_csrf_token` 获取 CSRF Token
 */
export interface GetCsrfTokenResponse extends IAPIResponse {
  token: number;
}

/**
 * Onebot v11 `get_credentials` 获取 QQ 相关接口凭证
 */
export interface GetCredentialsRequest extends IAPIRequest {
  domain: string;
}

export interface GetCredentialsResponse extends IAPIResponse {
  cookies: string;
  csrf_token: number;
}

/**
 * Onebot v11 `get_record` 获取语音
 */
export interface GetRecordRequest extends IAPIRequest {
  file: string;
  out_format: string;
}

export interface GetRecordResponse extends IAPIResponse {
  file: string;
}

/**
 * Onebot v11 `get_image` 获取图片
 */
export interface GetImageRequest extends IAPIRequest {
  file: string;
}

export interface GetImageResponse extends IAPIResponse {
  file: string;
}

/**
 * Onebot v11 `can_send_image` 检查是否可以发送图片
 */
export interface CanSendImageResponse extends IAPIResponse {
  yes: boolean;
}

/**
 * Onebot v11 `can_send_record` 检查是否可以发送语音
 */
export interface CanSendRecordResponse extends IAPIResponse {
  yes: boolean;
}

/**
 * Onebot v11 `get_status` 接口响应参数接口约束
 */
export interface GetStatusResponse extends IAPIResponse {
  online: boolean;
  good: boolean;
  [key: string]: any;
}

/**
 * Onebot v11 `get_version_info` 获取版本信息
 */
export interface GetStatusInfoResponse extends IAPIResponse {
  app_name: string;
  app_version: string;
  protocol_version: string;
  [key: string]: any;
}

/**
 * Onebot v11 `set_restart` 重启 OneBot 实现
 */
export interface SetRestartResponse extends IAPIResponse {
  delay: number;
}

/**
 * Onebot v11 `clean_cache` 清理缓存
 */
export interface CleanCacheResponse extends IAPIResponse {}
