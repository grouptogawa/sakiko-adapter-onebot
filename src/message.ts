import { escapeCQParam } from "./utils";

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
  UNSUPPORTED = "unsupported"
}

/**
 * Onebot v11 消息段基类
 */
export abstract class MessageSegment {
  abstract type: SegmentType;
  abstract data: object;

  abstract summary(): string;
  abstract cq(): string;

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
    return this.map((segment) => segment.summary()).join(" ");
  }

  cq(): string {
    return this.map((segment) => segment.cq()).join("");
  }

  static fromArray(input: SegmentLike[]): Message {
    let msg = new Message();
    input.forEach((seg) => {
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
        // TODO: 添加更多消息段类型的解析
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
}

/**
 * Onebot v11 文本消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Text extends MessageSegment {
  override type = SegmentType.TEXT;
  override data: { text: string };

  constructor(text: string) {
    super();
    this.data = { text };
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
}

/**
 * Onebot v11 提及消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class At extends MessageSegment {
  override type = SegmentType.AT;
  override data: { qq: string | "all" };
  constructor(qq: string | "all") {
    super();
    this.data = { qq };
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
}

/**
 * Onebot v11 回复消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Reply extends MessageSegment {
  override type = SegmentType.REPLY;
  override data: { id: string };

  constructor(id: string) {
    super();
    this.data = { id };
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
    this.data = { id, raw, resultId, chainCount };
  }
  override summary(): string {
    return `[表情#${this.data.id}]`;
  }

  override cq(): string {
    return convertCQ(SegmentType.FACE, this.data);
  }

  static fromObj(obj: SegmentLike): Face {
    return new Face(
      Number(obj.data.id),
      obj.data.raw,
      obj.data.resultId,
      obj.data.chainCount
    );
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
  constructor(
    emojiId: string,
    emojiPackageId: string,
    key?: string,
    summary?: string
  ) {
    super();
    this.data = { emojiId, emojiPackageId, key, summary };
  }
  override summary(): string {
    return this.data.summary ?? `[商城表情#${this.data.emojiId}]`;
  }
  override cq(): string {
    return convertCQ(SegmentType.MFACE, this.data);
  }

  static fromObj(obj: SegmentLike): MFace {
    return new MFace(
      String(obj.data.emojiId),
      String(obj.data.emojiPackageId),
      obj.data.key,
      obj.data.summary
    );
  }
}

/**
 * Onebot v11 骰子表情消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Dice extends MessageSegment {
  override type = SegmentType.DICE;
  override data: { result?: string };

  constructor(result?: string) {
    super();
    this.data = { result };
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
  override data: { result?: string };
  constructor(result?: string) {
    super();
    this.data = { result };
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
}

/**
 * Onebot v11 戳一戳消息段
 * @extends MessageSegment 消息段抽象基类
 */
export class Poke extends MessageSegment {
  override type = SegmentType.POKE;
  override data: { type: string; id: string };

  constructor(type: string, id: string) {
    super();
    this.data = { type, id };
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

  constructor(
    file: string,
    url?: string,
    summary?: string,
    subType?: string,
    fileSize?: number,
    key?: string,
    emojiId?: string,
    emojiPackageId?: string
  ) {
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
    return (
      this.data.emojiId !== undefined && this.data.emojiPackageId !== undefined
    );
  }

  static fromObj(obj: SegmentLike): Image {
    return new Image(
      String(obj.data.file),
      String(obj.data.url),
      obj.data.summary,
      obj.data.subType,
      obj.data.fileSize,
      obj.data.key,
      obj.data.emojiId,
      obj.data.emojiPackageId
    );
  }
}
