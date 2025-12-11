import { OB11Segments, type At, type SegmentLike, type Text } from "./segment";
import { summarizeMessage } from "./summary";
import { MessageEvent } from "../event/message-event";

/**
 * 消息数组类型，用于表示一个 Onebot V11 消息内容，可以包含多个消息段
 */
export class Message extends Array<SegmentLike> {
    constructor(...segments: SegmentLike[]) {
        super(...segments);
    }

    /**
     * 总结消息内容，效果类似于预览文本内容
     * @returns 总结文本
     */
    summary(): string {
        return summarizeMessage(this);
    }

    /**
     * 提取消息中的纯文本内容
     * @returns 纯文本内容
     */
    plaintext(): string {
        return this.filter((seg) => seg.type === OB11Segments.TEXT)
            .map((seg) => (seg as Text).data.text)
            .join("");
    }

    /**
     * 检查消息中是否提及了指定的用户
     * @param userId 要检查的用户 ID
     * @param allowAll 是否允许全体成员提及
     * @returns 如果提及了指定用户则返回 true，否则返回 false
     */
    mentioned(userId: string | number, allowAll: boolean): boolean {
        return this.some((seg) => seg.type === OB11Segments.AT && ((seg as At).data.qq === String(userId) || (allowAll && (seg as At).data.qq === "all")));
    }

    /**
     * 在消息中添加文本消息段
     * @param texts 多个文本内容，将会被连接成一个文本消息段
     * @returns 当前消息对象，支持链式调用
     */
    text(...texts: unknown[]): Message {
        // 将参数全部转换为字符串并连接
        const combinedText = texts.map((t) => String(t)).join("");
        return new Message(...this, { type: OB11Segments.TEXT, data: { text: combinedText } });
    }

    /**
     * 在消息中添加提及（AT）消息段
     * @param qq 要提及的 QQ 号，传入 "all" 则表示提及全体成员
     * @returns 当前消息对象，支持链式调用
     */
    mention(qq: string | number | "all"): Message {
        return new Message(...this, { type: OB11Segments.AT, data: { qq: String(qq) } });
    }

    /**
     * 在消息中添加回复消息段
     * @param messageId 要回复的消息 ID
     * @returns 当前消息对象，支持链式调用
     */
    reply<ME extends MessageEvent<any> = MessageEvent<any>>(messageId: string | number | ME): Message {
        if (messageId instanceof MessageEvent) {
            messageId = messageId.getPayload().message_id;
        }
        return new Message(...this, { type: OB11Segments.REPLY, data: { id: String(messageId) } });
    }

    /**
     * 在消息中添加表情消息段
     * @param faceId 表情 ID
     * @returns 当前消息对象，支持链式调用
     */
    face(faceId: string | number): Message {
        return new Message(...this, { type: OB11Segments.FACE, data: { id: String(faceId) } });
    }

    /**
     * 在消息中添加商城表情消息段
     * @param emojiId 表情 ID
     * @param emojiPackageId 表情包 ID
     * @param key 表情关键字
     * @param summary 表情摘要
     * @returns 当前消息对象，支持链式调用
     */
    mface(emojiId: string, emojiPackageId: string, key: string, summary?: string): Message {
        return new Message(...this, { type: OB11Segments.MFACE, data: { emoji_id: emojiId, emoji_package_id: emojiPackageId, key, summary } });
    }

    /**
     * 在消息中添加骰子消息段
     * @returns 当前消息对象，支持链式调用
     */
    dice(): Message {
        return new Message(...this, { type: OB11Segments.DICE, data: {} });
    }

    /**
     * 在消息中添加猜拳消息段
     * @returns 当前消息对象，支持链式调用
     */
    rps(): Message {
        return new Message(...this, { type: OB11Segments.RPS, data: {} });
    }

    /**
     * 在消息中添加戳一戳消息段
     * @param type 戳一戳类型
     * @param id 戳一戳 ID
     * @returns 当前消息对象，支持链式调用
     */
    poke(type: string, id: string | number): Message {
        return new Message(...this, { type: OB11Segments.POKE, data: { type, id: String(id) } });
    }

    /**
     * 在消息中添加图片消息段
     * @param file 图片文件路径或 URL
     * @param options 其他选项
     * @returns 当前消息对象，支持链式调用
     */
    image(file: string, options: { url?: string; summary?: string; sub_type?: number }): Message {
        return new Message(...this, { type: OB11Segments.IMAGE, data: { file, ...options } });
    }

    /**
     * 在消息中添加语音消息段
     * @param file 语音文件路径或 URL
     * @returns 当前消息对象，支持链式调用
     */
    record(file: string): Message {
        return new Message(...this, { type: OB11Segments.RECORD, data: { file } });
    }

    /**
     * 在消息中添加视频消息段
     * @param file 视频文件路径或 URL
     * @param thumb 视频缩略图文件路径或 URL
     * @returns 当前消息对象，支持链式调用
     */
    video(file: string, thumb?: string): Message {
        return new Message(...this, { type: OB11Segments.VIDEO, data: { file, thumb } });
    }

    /**
     * 在消息中添加文件消息段
     * @param file 文件路径或 URL
     * @param filename 文件名
     * @returns 当前消息对象，支持链式调用
     */
    file(file: string, filename?: string): Message {
        return new Message(...this, { type: OB11Segments.FILE, data: { file, filename } });
    }

    /**
     * 在消息中添加戳一戳消息段
     * @returns 当前消息对象，支持链式调用
     */
    shake(): Message {
        return new Message(...this, { type: OB11Segments.SHAKE, data: {} });
    }

    /**
     * 在消息中添加 JSON 卡片消息段
     * @param json JSON 对象或字符串
     * @returns 当前消息对象，支持链式调用
     */
    json(json: object | string): Message {
        if (typeof json !== "string") {
            json = JSON.stringify(json);
        }
        return new Message(...this, { type: OB11Segments.JSON, data: { data: json } });
    }

    /**
     * 在消息中添加 XML 卡片消息段
     * @param xml XML 字符串
     * @returns 当前消息对象，支持链式调用
     */
    xml(xml: string): Message {
        return new Message(...this, { type: OB11Segments.XML, data: { data: xml } });
    }

    /**
     * 在消息中添加音乐分享卡片消息段
     * @param type 音乐类型，如 "qq", "163", "kugou", "kuwo", "migu", "custom"
     * @param options 其他选项，如 id, url, image, singer, title, content
     * @returns 当前消息对象，支持链式调用
     */
    music(type: string | "qq" | "163" | "kugou" | "kuwo" | "migu" | "custom", options?: { id?: string; url?: string; image?: string; singer?: string; title?: string; content?: string }): Message {
        return new Message(...this, { type: OB11Segments.MUSIC, data: { type, ...options } });
    }

    /**
     * 在消息中添加聊天记录消息段
     * @param messageId 聊天记录 ID
     * @returns 当前消息对象，支持链式调用
     */
    forward(messageId: string): Message {
        return new Message(...this, { type: OB11Segments.FORWARD, data: { id: messageId } });
    }

    /**
     * 在消息中添加匿名消息段
     * @param ignore 无法匿名时是否继续发送
     * @returns 当前消息对象，支持链式调用
     */
    anonymous(ignore?: boolean): Message {
        return new Message(...this, { type: OB11Segments.ANONYMOUS, data: { ignore } });
    }

    /**
     * 在消息中添加分享消息段
     * @param url 分享链接
     * @param title 分享标题
     * @param options 其他选项，如 content, image
     * @returns 当前消息对象，支持链式调用
     */
    share(url: string, title: string, options?: { content?: string; image?: string }): Message {
        return new Message(...this, { type: OB11Segments.SHARE, data: { url, title, ...options } });
    }

    /**
     * 在消息中添加推荐联系人或群消息段
     * @param type 推荐类型，如 "qq" 或 "group"
     * @param id 推荐的 QQ 号或群号
     * @returns 当前消息对象，支持链式调用
     */
    contact(type: "qq" | "group", id: string | number): Message {
        return new Message(...this, { type: OB11Segments.CONTACT, data: { type, id: String(id) } });
    }

    /**
     * 在消息中添加位置消息段
     * @param lat 纬度
     * @param lon 经度
     * @param options 其他选项，如 title, content
     * @returns 当前消息对象，支持链式调用
     */
    location(lat: string | number, lon: string | number, options?: { title?: string; content?: string }): Message {
        return new Message(...this, { type: OB11Segments.LOCATION, data: { lat: String(lat), lon: String(lon), ...options } });
    }

    /**
     * 在消息中添加消息节点消息段
     * @param userId 用户 ID
     * @param nickname 昵称
     * @param content 消息内容
     * @returns 当前消息对象，支持链式调用
     */
    node(userId: string | number, nickname: string, content: SegmentLike[]): Message {
        return new Message(...this, { type: OB11Segments.NODE, data: { userId: String(userId), nickname, content } });
    }
}

type MessageFactory = Message & {
    (...segments: SegmentLike[]): Message;
};

const _message = function (...segments: SegmentLike[]): Message {
    return new Message(...segments);
};

Object.setPrototypeOf(_message, Message.prototype);

export const message = _message as MessageFactory;
