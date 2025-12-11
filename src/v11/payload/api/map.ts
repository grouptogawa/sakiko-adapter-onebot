import type { OB11GroupMessageAnonymous, OB11GroupMessageSender, OB11MessageType } from "../event/message";

import type { OB11HonorType } from "../event/notice";
import type { SegmentLike } from "../../message/segment";

export type OB11APIAction = keyof OB11APIRequestResponseMap;

export type OB11APIRequestResponseMap = {
    send_private_msg: {
        req: {
            user_id: number;
            message: SegmentLike[] | string;
            auto_escape?: boolean;
        };
        res: {
            message_id: number;
        };
    };
    send_group_msg: {
        req: {
            group_id: number;
            message: SegmentLike[] | string;
            auto_escape?: boolean;
        };
        res: {
            message_id: number;
        };
    };
    send_msg: {
        req: {
            message_type: OB11MessageType;
            user_id?: number;
            group_id?: number;
            message: SegmentLike[] | string;
            auto_escape?: boolean;
        };
        res: {
            message_id: number;
        };
    };
    delete_msg: {
        req: {
            message_id: number;
        };
        res: {};
    };
    get_msg: {
        req: {
            message_id: number;
        };
        res: {
            time: number;
            message_type: OB11MessageType;
            message_id: number;
            real_id: number;
            sender: OB11GroupMessageSender;
            message: SegmentLike[] | string;
        };
    };
    get_forward_msg: {
        req: {
            id: number;
        };
        res: {
            message: SegmentLike[] | string;
        };
    };
    send_like: {
        req: {
            user_id: number;
            times: number;
        };
        res: {};
    };
    set_group_kick: {
        req: {
            group_id: number;
            user_id: number;
            reject_add_request: boolean;
        };
        res: {};
    };
    set_group_ban: {
        req: {
            group_id: number;
            user_id: number;
            duration: number;
        };
        res: {};
    };
    set_group_anonymous_ban: {
        req: {
            group_id: number;
            anonymous?: OB11GroupMessageAnonymous;
            anonymous_flag?: string;
            flag?: string;
            duration: number;
        };
        res: {};
    };
    set_group_whole_ban: {
        req: {
            group_id: number;
            enable: boolean;
        };
        res: {};
    };
    set_group_admin: {
        req: {
            group_id: number;
            user_id: number;
            enable: boolean;
        };
        res: {};
    };
    set_group_anonymous: {
        req: {
            group_id: number;
            enable: boolean;
        };
        res: {};
    };
    set_group_card: {
        req: {
            group_id: number;
            user_id: number;
            card: string;
        };
        res: {};
    };
    set_group_name: {
        req: {
            group_id: number;
            group_name: string;
        };
        res: {};
    };
    set_group_leave: {
        req: {
            group_id: number;
            is_dismiss: boolean;
        };
        res: {};
    };
    set_group_special_title: {
        req: {
            group_id: number;
            user_id: number;
            special_title: string;
            duration: number;
        };
        res: {};
    };
    set_friend_add_request: {
        req: {
            flag: string;
            approve: boolean;
            remark: string;
        };
        res: {};
    };
    set_group_add_request: {
        req: {
            flag: string;
            sub_type?: "invite" | "approve";
            type?: "invite" | "approve";
            approve: boolean;
            reason?: string;
        };
        res: {};
    };
    get_login_info: {
        req: {};
        res: {
            user_id: number;
            nickname: string;
        };
    };
    get_stranger_info: {
        req: {
            user_id: number;
            no_cache?: boolean;
        };
        res: {
            user_id: number;
            nickname: string;
            sex: string;
            age: number;
        };
    };
    get_friend_list: {
        req: {};
        res: Array<{
            user_id: number;
            nickname: string;
            remark: string;
        }>;
    };
    get_group_info: {
        req: {
            group_id: number;
            no_cache?: boolean;
        };
        res: {
            group_id: number;
            group_name: string;
            group_count: number;
            max_member_count: number;
        };
    };
    get_group_list: {
        req: {};
        res: Array<{
            group_id: number;
            group_name: string;
            member_count: number;
            max_member_count: number;
        }>;
    };
    get_group_member_info: {
        req: {
            group_id: number;
            user_id: number;
            no_cache?: boolean;
        };
        res: {
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
        };
    };
    get_group_member_list: {
        req: {
            group_id: number;
        };
        res: Array<{
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
        }>;
    };
    get_group_honor_info: {
        req: {
            group_id: number;
            type: OB11HonorType;
        };
        res: {
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
        };
    };
    get_cookies: {
        req: {
            domain: string;
        };
        res: {
            cookies: string;
        };
    };
    get_csrf_token: {
        req: {};
        res: {
            token: number;
        };
    };
    get_credentials: {
        req: {
            domain: string;
        };
        res: {
            cookies: string;
            csrf_token: number;
        };
    };
    get_record: {
        req: {
            file: string;
            out_format: string;
        };
        res: {
            file: string;
        };
    };
    get_image: {
        req: {
            file: string;
        };
        res: {
            file: string;
        };
    };
    can_send_image: {
        req: {};
        res: {
            yes: boolean;
        };
    };
    can_send_record: {
        req: {};
        res: {
            yes: boolean;
        };
    };
    get_status: {
        req: {};
        res: {
            online: boolean;
            good: boolean;
            [key: string]: any;
        };
    };
    get_version_info: {
        req: {};
        res: {
            app_name: string;
            app_version: string;
            protocol_version: string;
            [key: string]: any;
        };
    };
    set_restart: {
        req: {};
        res: {
            delay: number;
        };
    };
    clean_cache: {
        req: {};
        res: {};
    };
};
