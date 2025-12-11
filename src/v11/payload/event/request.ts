import type { OB11EventPayload } from "./base";

type OB11RequestType = "friend" | "group";

type OB11GroupRequestSubType = "add" | "invite";

export interface OB11RequestEventPayload extends OB11EventPayload {
    post_type: "request";

    request_type: OB11RequestType;
    user_id: number;
    comment: string;
    flag: string;
}

export interface OB11FriendRequestEventPayload extends OB11RequestEventPayload {
    request_type: "friend";
}

export interface OB11GroupRequestEventPayload extends OB11RequestEventPayload {
    request_type: "group";

    group_id: number;
    sub_type: OB11GroupRequestSubType;
}
