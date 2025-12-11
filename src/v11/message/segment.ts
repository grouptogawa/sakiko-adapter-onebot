export enum OB11Segments {
    TEXT = "text",
    FACE = "face",
    MFACE = "mface",
    IMAGE = "image",
    RECORD = "record",
    VIDEO = "video",
    AT = "at",
    RPS = "rps",
    DICE = "dice",
    SHAKE = "shake",
    POKE = "poke",
    ANONYMOUS = "anonymous",
    SHARE = "share",
    CONTACT = "contact",
    LOCATION = "location",
    MUSIC = "music",
    REPLY = "reply",
    FORWARD = "forward",
    NODE = "node",
    XML = "xml",
    JSON = "json",
    FILE = "file"
}

export type SegmentLike = {
    type: OB11Segments;
    data: object;
};

export type Text = SegmentLike & {
    type: OB11Segments.TEXT;
    data: {
        text: string;
    };
};

export type At = SegmentLike & {
    type: OB11Segments.AT;
    data: {
        qq: string | "all";
    };
};

export type Reply = SegmentLike & {
    type: OB11Segments.REPLY;
    data: {
        id: string;
    };
};

export type Face = SegmentLike & {
    type: OB11Segments.FACE;
    data: {
        id: string;
        raw?: any;
        resultId?: string;
        chainCount?: number;
    };
};

export type MFace = SegmentLike & {
    type: OB11Segments.MFACE;
    data: {
        emoji_id: string;
        emoji_package_id: string;
        key?: string;
        summary?: string;
    };
};

export type Dice = SegmentLike & {
    type: OB11Segments.DICE;
    data: {
        result?: string;
    };
};

export type RPS = SegmentLike & {
    type: OB11Segments.RPS;
    data: {
        result?: string;
    };
};

export type Poke = SegmentLike & {
    type: OB11Segments.POKE;
    data: {
        type: string;
        id: string;
    };
};

export type Image = SegmentLike & {
    type: OB11Segments.IMAGE;
    data: {
        file: string;
        url?: string;
        summary?: string;
        sub_type?: number;
        file_size?: number;

        key?: string;
        emoji_id?: string;
        emoji_package_id?: string;
    };
};

export type Record = SegmentLike & {
    type: OB11Segments.RECORD;
    data: {
        file: string;
        file_size?: number;
        path?: string;
    };
};

export type Video = SegmentLike & {
    type: OB11Segments.VIDEO;
    data: {
        file: string;
        url?: string;
        file_size?: number;
        thumb?: string;
    };
};

export type File = SegmentLike & {
    type: OB11Segments.FILE;
    data: {
        file: string;
        file_id?: string;
        file_size?: number;
    };
};

export type Shake = SegmentLike & {
    type: OB11Segments.SHAKE;
    data: {};
};

export type Json = SegmentLike & {
    type: OB11Segments.JSON;
    data: {
        data: string | object;
    };
};

export type Xml = SegmentLike & {
    type: OB11Segments.XML;
    data: {
        data: string;
    };
};

export type Music = SegmentLike & {
    type: OB11Segments.MUSIC;
    data: {
        type: string | "qq" | "163" | "kugou" | "kuwo" | "migu" | "custom";
        id?: string;
        url?: string;
        image?: string;
        singer?: string;
        title?: string;
        content?: string;
    };
};

export type Forward = SegmentLike & {
    type: OB11Segments.FORWARD;
    data: {
        id: string;
        content?: SegmentLike[];
    };
};

export type Anonymous = SegmentLike & {
    type: OB11Segments.ANONYMOUS;
    data: {
        ignore?: boolean;
    };
};

export type Share = SegmentLike & {
    type: OB11Segments.SHARE;
    data: {
        url: string;
        title: string;
        content?: string;
        image?: string;
    };
};

export type Contact = SegmentLike & {
    type: OB11Segments.CONTACT;
    data: {
        type: string | "qq" | "group";
        id: string;
    };
};

export type Location = SegmentLike & {
    type: OB11Segments.LOCATION;
    data: {
        lat: string;
        lon: string;
        title?: string;
        content?: string;
    };
};

export type Node = SegmentLike & {
    type: OB11Segments.NODE;
    data: {
        userId: string;
        nickname: string;
        content: SegmentLike[];
    };
};
