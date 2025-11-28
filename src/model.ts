import {randomUUID} from "crypto";

/**
 * Onebot v11 API 请求参数接口约束
 */
export interface IAPIRequest {}

/**
 * Onebot v11 API 响应参数接口约束
 */
export interface IAPIResponse {}

export class WebSocketMessageRequest {
  action: string;
  params: IAPIRequest;
  echo: string;

  constructor(action: string, params: IAPIRequest, echo: string) {
    this.action = action;
    this.params = params;
    this.echo = echo;
  }

  toString() {
    return JSON.stringify(this);
  }
}

/**
 * Onebot v11 `get_status` 接口响应参数接口约束
 */
export interface GetStatusResponse extends IAPIResponse {
  online: boolean;
  good: boolean;
  [key: string]: any;
}
