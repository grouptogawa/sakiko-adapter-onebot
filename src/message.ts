import {escapeCQParam} from "./utils";

function convertCQ(type: SegmentType, data: object): string {
  // 将传入的对象展开转换成字符串序列
  let params: string[] = [];
  params.push(`CQ:${type}`); // 第一个参数是CQ码的类型标识
  for (const [key, value] of Object.entries(data)) {
    // 如果参数是字符串则进行转义
    if (typeof value === "string") {
      params.push(`${key}=${escapeCQParam(value)}`);
    } else {
      params.push(`${key}=${String(value)}`);
    }
  }
  return `[${params.join(",")}]`;
}

// 消息段类型枚举
enum SegmentType {
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
  UNSUPPORTED = "unsupported",
  FILE = "file"
}

/**
 * Onebot v11 消息段基类
 */
export abstract class MessageSegment {
  abstract type: SegmentType;
  abstract data: object;

  abstract summary(): string;
  abstract cq(): string;
  abstract toObj(): SegmentLike;

  static text(text: string): Text {
    return new Text(text);
  }

  static at(qq: string | number | "all"): At {
    return new At(String(qq));
  }

  static reply(id: string | number): Reply {
    return new Reply(String(id));
  }
}

// 消息段对象接口
interface SegmentLike {
  type: string;
  data: {
    [key: string]: any;
  };
}

function parseCQ(cq: string): MessageSegment {
  // TODO: 实现 CQ 码解析功能
  throw new Error("Not implemented");
}

/**
 * Onebot v11 消息段数组类型
 */
export class Message extends Array<MessageSegment> {
  constructor(...segments: MessageSegment[]) {
    super(...segments);
  }

  summary(): string {
    return this.map(segment => segment.summary()).join(" ");
  }

  cq(): string {
    return this.map(segment => segment.cq()).join("");
  }

  static fromArray(input: SegmentLike[]): Message {
    let msg = new Message();
    input.forEach(seg => {
      switch (seg.type) {
        case SegmentType.TEXT:
          msg.push(Text.fromObj(seg));
          break;
        case SegmentType.AT:
          msg.push(At.fromObj(seg));
          break;
        case SegmentType.REPLY:
          msg.push(Reply.fromObj(seg));
          break;
        case SegmentType.FACE:
          msg.push(Face.fromObj(seg));
          break;
        case SegmentType.MFACE:
          msg.push(MFace.fromObj(seg));
          break;
        case SegmentType.DICE:
          msg.push(Dice.fromObj(seg));
          break;
        case SegmentType.RPS:
          msg.push(RPS.fromObj(seg));
          break;
        case SegmentType.POKE:
          msg.push(Poke.fromObj(seg));
          break;
        case SegmentType.IMAGE:
          msg.push(Image.fromObj(seg));
          break;
        case SegmentType.RECORD:
          msg.push(Record.fromObj(seg));
          break;
        case SegmentType.VIDEO:
          msg.push(Video.fromObj(seg));
          break;
        case SegmentType.ANONYMOUS:
          msg.push(Anonymous.fromObj(seg));
          break;
        case SegmentType.SHARE:
          msg.push(Share.fromObj(seg));
          break;
        case SegmentType.CONTACT:
          msg.push(Contact.fromObj(seg));
          break;
        case SegmentType.LOCATION:
          msg.push(Location.fromObj(seg));
          break;
        case SegmentType.MUSIC:
          msg.push(Music.fromObj(seg));
          break;
        case SegmentType.FORWARD:
          msg.push(Forward.fromObj(seg));
          break;
        case SegmentType.NODE:
          msg.push(Node.fromObj(seg));
          break;
        case SegmentType.XML:
          msg.push(Xml.fromObj(seg));
          break;
        case SegmentType.JSON:
          msg.push(Json.fromObj(seg));
          break;
        case SegmentType.FILE:
          msg.push(File.fromObj(seg));
          break;
        case SegmentType.SHAKE:
          msg.push(Shake.fromObj(seg));
          break;

        default:
          msg.push(Unsupported.fromObj(seg));
          break;
      }
    });
    return msg;
  }
}

/**
 * Onebot v11 不支持的消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Unsupported extends MessageSegment {
  override type = SegmentType.UNSUPPORTED;
  override data: object;
  originalType: string;

  constructor(originalType: string, data: object) {
    super();
    this.data = data;
    this.originalType = originalType;
  }

  override summary(): string {
    return `[不支持的消息段类型: ${this.originalType}]`;
  }

  override cq(): string {
    return convertCQ(this.originalType as SegmentType, this.data);
  }

  static fromObj(obj: SegmentLike): Unsupported {
    return new Unsupported(obj.type, obj.data);
  }

  toObj(): SegmentLike {
    return {
      type: this.originalType,
      data: this.data
    };
  }
}

/**
 * Onebot v11 文本消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Text extends MessageSegment {
  override type = SegmentType.TEXT;
  override data: {text: string};

  constructor(text: string) {
    super();
    this.data = {text};
  }

  override summary(): string {
    return this.data.text;
  }
  override cq(): string {
    return escapeCQParam(this.data.text);
  }

  static fromObj(obj: SegmentLike): Text {
    return new Text(String(obj.data.text));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 提及消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class At extends MessageSegment {
  override type = SegmentType.AT;
  override data: {qq: string | "all"};
  constructor(qq: string | "all") {
    super();
    this.data = {qq};
  }

  override summary(): string {
    return `@${this.data.qq}`;
  }

  override cq(): string {
    return convertCQ(SegmentType.AT, this.data);
  }

  static fromObj(obj: SegmentLike): At {
    return new At(String(obj.data.qq));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 回复消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Reply extends MessageSegment {
  override type = SegmentType.REPLY;
  override data: {id: string};

  constructor(id: string) {
    super();
    this.data = {id};
  }

  override summary(): string {
    return `[回复#${this.data.id}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.REPLY, this.data);
  }

  static fromObj(obj: SegmentLike): Reply {
    return new Reply(String(obj.data.id));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/** Onebot v11 表情消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Face extends MessageSegment {
  override type = SegmentType.FACE;
  override data: {
    id: number;
    raw?: any;
    resultId?: string;
    chainCount?: number;
  };
  constructor(id: number, raw?: any, resultId?: string, chainCount?: number) {
    super();
    this.data = {id, raw, resultId, chainCount};
  }
  override summary(): string {
    return `[表情#${this.data.id}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.FACE, this.data);
  }

  static fromObj(obj: SegmentLike): Face {
    return new Face(Number(obj.data.id), obj.data.raw, obj.data.result_id, obj.data.chain_count);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 商城表情消息段
 *
 * 这个消息段一般只用于发送商城表情，接收时会被转换成图像消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class MFace extends MessageSegment {
  override type = SegmentType.MFACE;
  override data: {
    emojiId: string;
    emojiPackageId: string;
    key?: string;
    summary?: string;
  };
  constructor(emojiId: string, emojiPackageId: string, key?: string, summary?: string) {
    super();
    this.data = {emojiId, emojiPackageId, key, summary};
  }
  override summary(): string {
    return this.data.summary ?? `[商城表情#${this.data.emojiId}]`;
  }
  override cq(): string {
    return convertCQ(SegmentType.MFACE, this.data);
  }

  static fromObj(obj: SegmentLike): MFace {
    return new MFace(String(obj.data.emoji_id), String(obj.data.emoji_package_id), obj.data.key, obj.data.summary);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 骰子表情消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Dice extends MessageSegment {
  override type = SegmentType.DICE;
  override data: {result?: string};

  constructor(result?: string) {
    super();
    this.data = {result};
  }
  override summary(): string {
    return `[骰子#${this.data.result}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.DICE, this.data);
  }

  static fromObj(obj: SegmentLike): Dice {
    return new Dice(String(obj.data.result));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 猜拳表情消息段
 *
 * 返回结果对应关系如下
 *
 * 1：石头
 * 2：剪刀
 * 3：布
 * @extends MessageSegment 消息段抽象基类
 */
export class RPS extends MessageSegment {
  override type = SegmentType.RPS;
  override data: {result?: string};
  constructor(result?: string) {
    super();
    this.data = {result};
  }
  override summary(): string {
    return `[猜拳#${this.data.result}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.RPS, this.data);
  }

  static fromObj(obj: SegmentLike): RPS {
    return new RPS(String(obj.data.result));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 戳一戳消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Poke extends MessageSegment {
  override type = SegmentType.POKE;
  override data: {type: string; id: string};

  constructor(type: string, id: string) {
    super();
    this.data = {type, id};
  }
  override summary(): string {
    return `[戳一戳#${this.data.type}]`;
  }
  override cq(): string {
    return convertCQ(SegmentType.POKE, this.data);
  }

  static fromObj(obj: SegmentLike): Poke {
    return new Poke(String(obj.data.type), String(obj.data.id));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 图片消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Image extends MessageSegment {
  override type = SegmentType.IMAGE;
  override data: {
    file: string;
    url?: string;
    summary?: string;
    subType?: string;
    fileSize?: number;

    key?: string;
    emojiId?: string;
    emojiPackageId?: string;
  };

  constructor(file: string, url?: string, summary?: string, subType?: string, fileSize?: number, key?: string, emojiId?: string, emojiPackageId?: string) {
    super();
    this.data = {
      file,
      url,
      summary,
      subType,
      fileSize,
      key,
      emojiId,
      emojiPackageId
    };
  }

  override summary(): string {
    return this.data.summary ?? `[图片#${this.data.file}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.IMAGE, this.data);
  }

  isMface(): boolean {
    return this.data.emojiId !== undefined && this.data.emojiPackageId !== undefined;
  }

  static fromObj(obj: SegmentLike): Image {
    return new Image(String(obj.data.file), String(obj.data.url), obj.data.summary, obj.data.sub_type, obj.data.fileSize, obj.data.key, obj.data.emoji_id, obj.data.emoji_package_id);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 语音消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Record extends MessageSegment {
  override type = SegmentType.RECORD;
  override data: {
    file: string;
    fileSize?: number;
    path?: string;
  };

  constructor(file: string, fileSize?: number, path?: string) {
    super();
    this.data = {file, fileSize, path};
  }

  override summary(): string {
    return this.data.path ?? `[语音#${this.data.file}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.RECORD, this.data);
  }

  static fromObj(obj: SegmentLike): Record {
    return new Record(String(obj.data.file), obj.data.file_size, obj.data.path);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 视频消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Video extends MessageSegment {
  override type = SegmentType.VIDEO;
  override data: {
    file: string;
    url?: string;
    fileSize?: number;
    thumb?: string;
  };

  constructor(file: string, url?: string, fileSize?: number, thumb?: string) {
    super();
    this.data = {file, url, fileSize, thumb};
  }

  override summary(): string {
    return this.data.url ?? `[视频#${this.data.file}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.VIDEO, this.data);
  }

  static fromObj(obj: SegmentLike): Video {
    return new Video(String(obj.data.file), String(obj.data.url), obj.data.file_size, obj.data.thumb);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 文件消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class File extends MessageSegment {
  override type = SegmentType.FILE;
  override data: {
    file: string;
    fileId?: string;
    fileSize?: number;
  };

  constructor(file: string, fileId?: string, fileSize?: number) {
    super();
    this.data = {file, fileId, fileSize};
  }

  override summary(): string {
    return this.data.fileId ?? `[文件#${this.data.file}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.FILE, this.data);
  }

  static fromObj(obj: SegmentLike): File {
    return new File(String(obj.data.file), String(obj.data.file_id), obj.data.file_size);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 JSON 消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Json extends MessageSegment {
  override type = SegmentType.JSON;
  override data: {
    data: string | object;
  };

  constructor(data: string | object) {
    super();
    this.data = {data};
  }

  override summary(): string {
    return `[JSON#${this.data.data}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.JSON, this.data);
  }

  static fromObj(obj: SegmentLike): Json {
    return new Json(obj.data.data);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 音乐消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Music extends MessageSegment {
  override type = SegmentType.MUSIC;
  override data: {
    type: string | "qq" | "163" | "kugou" | "kuwo" | "migu" | "custom";
    id?: string;
    url?: string;
    image?: string;
    singer?: string;
    title?: string;
    content?: string;
  };

  constructor(type: string, id?: string, url?: string, image?: string, singer?: string, title?: string, content?: string) {
    super();
    this.data = {type, id, url, image, singer, title, content};
  }

  override summary(): string {
    return `[音乐#${this.data.type}#${this.data.id}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.MUSIC, this.data);
  }

  static fromObj(obj: SegmentLike): Music {
    return new Music(String(obj.data.type), String(obj.data.id), String(obj.data.url), String(obj.data.image), String(obj.data.singer), String(obj.data.title), String(obj.data.content));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 转发消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Forward extends MessageSegment {
  override type = SegmentType.FORWARD;
  override data: {
    id: string;
    content?: object | Message[];
  };

  constructor(id: string, content?: object | Message[]) {
    super();
    this.data = {id, content};
  }

  override summary(): string {
    return `[转发#${this.data.id}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.FORWARD, this.data);
  }

  static fromObj(obj: SegmentLike): Forward {
    return new Forward(String(obj.data.id), obj.data.content);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 戳一戳消息段，作为 Poke 的快捷方式，仅在发送时可用
 * @extends MessageSegment 消息段抽象基类
 */
export class Shake extends MessageSegment {
  override type = SegmentType.SHAKE;
  override data: {};

  constructor() {
    super();
    this.data = {};
  }

  override summary(): string {
    return `[戳一戳]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.SHAKE, this.data);
  }

  static fromObj(obj: SegmentLike): Shake {
    return new Shake();
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 匿名消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Anonymous extends MessageSegment {
  override type = SegmentType.ANONYMOUS;
  override data: {
    ignore?: boolean;
  };

  constructor(ignore?: boolean) {
    super();
    this.data = {ignore};
  }

  override summary(): string {
    return `[匿名]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.ANONYMOUS, this.data);
  }

  static fromObj(obj: SegmentLike): Anonymous {
    return new Anonymous(obj.data.ignore);
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 分享消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Share extends MessageSegment {
  override type = SegmentType.SHARE;
  override data: {
    url: string;
    title: string;
    content?: string;
    image?: string;
  };

  constructor(url: string, title: string, content?: string, image?: string) {
    super();
    this.data = {url, title: title, content, image};
  }

  override summary(): string {
    return `[分享#${this.data.url}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.SHARE, this.data);
  }

  static fromObj(obj: SegmentLike): Share {
    return new Share(String(obj.data.url), String(obj.data.title), String(obj.data.content), String(obj.data.image));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 推荐群消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Contact extends MessageSegment {
  override type = SegmentType.CONTACT;
  override data: {
    type: string | "group";
    id: string;
  };

  constructor(type: string | "group", id: string) {
    super();
    this.data = {type, id};
  }

  override summary(): string {
    return `[推荐群#${this.data.type}#${this.data.id}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.CONTACT, this.data);
  }

  static fromObj(obj: SegmentLike): Contact {
    return new Contact(String(obj.data.type), String(obj.data.id));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 位置消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Location extends MessageSegment {
  override type = SegmentType.LOCATION;
  override data: {
    lat: string;
    lon: string;
    title?: string;
    content?: string;
  };

  constructor(latitude: string, longitude: string, title?: string, content?: string) {
    super();
    this.data = {lat: latitude, lon: longitude, title, content};
  }

  override summary(): string {
    return `[位置#${this.data.lat}#${this.data.lon}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.LOCATION, this.data);
  }

  static fromObj(obj: SegmentLike): Location {
    return new Location(String(obj.data.lat), String(obj.data.lon), String(obj.data.title), String(obj.data.content));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 转发消息节点消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Node extends MessageSegment {
  override type = SegmentType.NODE;
  override data: {
    userId: string;
    nickname: string;
    content: Message | MessageSegment[] | object[];
  };

  constructor(userId: string, nickname: string, content: Message | MessageSegment[] | object[]) {
    super();
    this.data = {userId, nickname, content};
  }

  override summary(): string {
    return `[转发节点#${this.data.userId}#${this.data.nickname}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.NODE, this.data);
  }

  static fromObj(obj: SegmentLike): Node {
    return new Node(String(obj.data.user_id), String(obj.data.nickname), Message.fromArray(obj.data.content));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}

/**
 * Onebot v11 XML 消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Xml extends MessageSegment {
  override type = SegmentType.XML;
  override data: {
    data: string;
  };

  constructor(data: string) {
    super();
    this.data = {data};
  }

  override summary(): string {
    return `[XML#${this.data.data}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.XML, this.data);
  }

  static fromObj(obj: SegmentLike): Xml {
    return new Xml(String(obj.data.data));
  }

  toObj(): SegmentLike {
    return {
      type: this.type,
      data: this.data
    };
  }
}
