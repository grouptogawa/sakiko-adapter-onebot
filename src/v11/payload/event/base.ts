export type OB11PostType = "message" | "notice" | "request" | "meta_event";

export interface OB11EventPayload {
    time: number;
    self_id: number;
    post_type: OB11PostType;
}
