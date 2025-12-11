import chalk from "chalk";
import { GroupMessageEvent, PrivateMessageEvent } from "./event/message-event";
import { type ISakikoLogger } from "@grouptogawa/sakiko";

/**
 * 检查访问令牌是否符合预期
 * @param token 访问令牌字符串
 * @param expected 预期的令牌值
 * @returns 如果令牌符合预期则返回 true，否则返回 false
 */
export function expectedAccessToken(token: string, expected: string) {
    return token === "Bearer " + expected;
}

type EventLoggerMap = {
    [K: string]: ((logger: ISakikoLogger, event: any) => void) | undefined;
};

export const logEventMap: EventLoggerMap = {
    PrivateMessageEvent: (logger: ISakikoLogger, e: PrivateMessageEvent) => {
        logger.info(
            `[${chalk.yellowBright(e.getSelfId())}] [私聊] ${e.payload.sender.nickname ?? "获取用户昵称失败"}(${e.getSenderId()}): ` +
                e.summary()
        );
    },
    GroupMessageEvent: (logger: ISakikoLogger, e: GroupMessageEvent) => {
        logger.info(
            `[${chalk.yellowBright(e.getSelfId())}] [群 ${e.payload.group_id}] ${e.payload.sender.nickname ?? "获取用户昵称失败"}(${e.getSenderId()}): ` +
                e.summary()
        );
    }
};
