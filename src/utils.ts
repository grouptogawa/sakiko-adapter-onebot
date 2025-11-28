/**
 * 检查访问令牌是否符合预期
 * @param token 访问令牌字符串
 * @param expected 预期的令牌值
 * @returns 如果令牌符合预期则返回 true，否则返回 false
 */
export function expectedAccessToken(token: string, expected: string) {
  return token === "Bearer " + expected;
}

/**
 * 转义 CQ 码参数中的特殊字符
 * @param param 要转义的参数字符串
 * @returns 转义后的字符串
 */
export function escapeCQParam(param: string): string {
  return param.replace(/[,&[\]]/g, (c) => {
    switch (c) {
      case "[":
        return "&#91;";
      case "]":
        return "&#93;";
      case ",":
        return "&#44;";
      case "&":
        return "&amp;";
      default:
        return c;
    }
  });
}

/**
 * 反转义 CQ 码参数中的特殊字符
 * @param param 要反转义的参数字符串
 * @returns 反转义后的字符串
 */
export function unescapeCQParam(param: string): string {
  return param.replace(/&#91;|&#93;|&#44;|&amp;/g, (c) => {
    switch (c) {
      case "&#91;":
        return "[";
      case "&#93;":
        return "]";
      case "&#44;":
        return ",";
      case "&amp;":
        return "&";
      default:
        return c;
    }
  });
}
