import * as s from "./segment";

const summarizeMap = {
    [s.OB11Segments.TEXT]: (seg: s.Text) => seg.data.text,
    [s.OB11Segments.AT]: (seg: s.At) => `@${seg.data.qq}`,
    [s.OB11Segments.REPLY]: (seg: s.Reply) => `[回复#${seg.data.id}]`,
    [s.OB11Segments.FACE]: (seg: s.Face) => `[表情#${seg.data.id}]`,
    [s.OB11Segments.MFACE]: (seg: s.MFace) => seg.data.summary?.trim() || `[商城表情#${seg.data.emoji_id}]`,
    [s.OB11Segments.DICE]: (seg: s.Dice) => `[骰子#${seg.data.result}]`,
    [s.OB11Segments.RPS]: (seg: s.RPS) => `[猜拳#${seg.data.result}]`,
    [s.OB11Segments.POKE]: (seg: s.Poke) => `[戳一戳#${seg.data.type}]`,
    [s.OB11Segments.IMAGE]: (seg: s.Image) => seg.data.summary?.trim() || `[图片#${seg.data.file}]`,
    [s.OB11Segments.RECORD]: (seg: s.Record) => `[语音#${seg.data.file}]`,
    [s.OB11Segments.VIDEO]: (seg: s.Video) => `[视频#${seg.data.file}]`,
    [s.OB11Segments.FILE]: (seg: s.File) => `[文件#${seg.data.file}]`,
    [s.OB11Segments.JSON]: (seg: s.Json) => `[JSON卡片]`,
    [s.OB11Segments.MUSIC]: (seg: s.Music) => `[音乐#${seg.data.type}:${seg.data.url}]`,
    [s.OB11Segments.FORWARD]: (seg: s.Forward) => `[聊天记录#${seg.data.id}]` + summarizeMessage(seg.data.content ?? []),
    [s.OB11Segments.SHAKE]: (seg: s.Shake) => `[戳一戳]`,
    [s.OB11Segments.ANONYMOUS]: (seg: s.Anonymous) => `[匿名]`,
    [s.OB11Segments.SHARE]: (seg: s.Share) => `[分享#${seg.data.url}]`,
    [s.OB11Segments.CONTACT]: (seg: s.Contact) => `[推荐#${seg.data.type}:${seg.data.id}]`,
    [s.OB11Segments.LOCATION]: (seg: s.Location) => `[位置#${seg.data.title ?? ""}:${seg.data.lat},${seg.data.lon}]`,
    [s.OB11Segments.NODE]: (seg: s.Node) => `[消息节点#${seg.data.nickname}(${seg.data.userId})]` + summarizeMessage(seg.data.content),
    [s.OB11Segments.XML]: (seg: s.Xml) => `[XML卡片]`
};

/**
 * 总结单个消息段，效果类似于预览文本内容
 * @param seg 消息段
 * @returns 总结文本
 */
export function summarizeSeg(seg: s.SegmentLike): string {
    const fn = summarizeMap[seg.type];
    return fn ? fn(seg as any) : "[未知消息]";
}

/**
 * 总结消息内容，效果类似于预览文本内容
 * @param message 消息内容
 * @returns 总结文本
 */
export function summarizeMessage(message: s.SegmentLike[]): string {
    return message.map(summarizeSeg).join("");
}
