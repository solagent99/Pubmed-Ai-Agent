/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PUBMED_API_KEY?: string;
      TWITTER_API_KEY?: string;
      TWITTER_API_SECRET?: string;
      TWITTER_ACCESS_TOKEN?: string;
      TWITTER_ACCESS_SECRET?: string;
    }

    interface Timer {
      ref(): Timer;
      unref(): Timer;
      hasRef(): boolean;
      refresh(): Timer;
      [Symbol.toPrimitive](): number;
    }

    interface Global {
      setTimeout: typeof setTimeout;
      clearTimeout: typeof clearTimeout;
      setInterval: typeof setInterval;
      clearInterval: typeof clearInterval;
    }
  }
}

declare module '@elizaos/core' {
  export type UUID = string;

  export interface Message {
    type: 'mention' | 'direct' | 'broadcast';
    id: string;
    text: string;
  }

  export interface Memory {
    id: string;
    type: string;
    content: unknown;
    metadata: Record<string, unknown>;
  }

  export interface State {
    id: string;
    data: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }

  export interface IAgentRuntime {
    memory: Memory[];
    state: State;
    config: Record<string, unknown>;
    execute(action: string, params?: Record<string, unknown>): Promise<unknown>;
  }

  export interface Scheduler {
    schedule(cronExpression: string, callback: () => Promise<void>): void;
  }

  export interface Character {
    id: UUID;
    name: string;
    modelProvider: ModelProviderName;
    bio: string[];
    style: {
      all: string[];
      chat: string[];
      post: string[];
    };
    lore: string[];
    messageExamples: Array<Array<{
      user: string;
      content: { text: string };
    }>>;
    postExamples: string[];
    topics: string[];
    adjectives: string[];
    knowledge: string[];
    clients: Clients[];
    plugins: string[];
    settings: {
      secrets: Record<string, string>;
      model: string;
      embeddingModel: string;
    };
  }

  export const defaultCharacter: Partial<Character>;

  export enum ModelProviderName {
    OPENAI = 'openai'
  }

  export enum Clients {
    TWITTER = 'twitter'
  }

  export const elizaLogger: {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
  };

  export interface ActionPlugin {
    name: string;
    version: string;
    dependencies?: string[];
    onStart?: (context: { scheduler: Scheduler; actions: Actions }) => Promise<void>;
    onMessage?: (message: Message, context: { actions: Actions }) => Promise<void>;
    actions: Array<{
      name: string;
      description: string;
      parameters?: Record<string, { type: string; optional?: boolean; description?: string }>;
      handler: (params: any, context: any) => Promise<void>;
    }>;
  }

  export interface Actions {
    execute(actionName: string, params?: Record<string, unknown>): Promise<unknown>;
  }
}

declare module '@elizaos/twitter-client' {
  export interface TwitterClient {
    createPost(text: string): Promise<void>;
    replyTo(tweetId: string, text: string): Promise<void>;
  }
}

declare module 'debug' {
  interface Debug {
    (namespace: string): (...args: any[]) => void;
    enable(namespaces: string): void;
    disable(): string;
    enabled(namespace: string): boolean;
    log: (...args: any[]) => void;
  }
  declare const debug: Debug;
  export = debug;
}

declare module 'axios' {
  export interface AxiosRequestConfig<D = any> {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: any;
    data?: D;
    timeout?: number;
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'document' | 'stream';
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
    status?: number;
  }

  export interface AxiosInstance {
    <T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  }

  export interface AxiosStatic extends AxiosInstance {
    create(config?: AxiosRequestConfig): AxiosInstance;
    isAxiosError(payload: any): payload is AxiosError;
  }

  const axios: AxiosStatic;
  export default axios;
}

declare module 'fast-xml-parser' {
  export interface XMLParserOptions {
    ignoreAttributes?: boolean;
    attributeNamePrefix?: string;
    textNodeName?: string;
    parseAttributeValue?: boolean;
    trimValues?: boolean;
  }

  export class XMLParser {
    constructor(options?: XMLParserOptions);
    parse(xml: string): any;
  }
}

declare module 'zod' {
  export class ZodError extends Error {
    issues: Array<{
      code: string;
      message: string;
      path: (string | number)[];
    }>;
    constructor(issues: ZodError['issues']);
  }

  export interface ZodType<T = any, Def = any> {
    _output: T;
    _def: Def;
    parse(data: unknown): T;
    safeParse(data: unknown): { success: true; data: T } | { success: false; error: ZodError };
    optional(): ZodOptional<this>;
    nullable(): ZodNullable<this>;
    refine(check: (data: T) => boolean, message: string): this;
    transform<U>(transform: (data: T) => U): ZodType<U>;
  }

  export interface ZodString extends ZodType<string> {
    regex(pattern: RegExp, message?: string): ZodString;
    trim(): ZodString;
    min(length: number, message?: string): ZodString;
    max(length: number, message?: string): ZodString;
    url(message?: string): ZodString;
    startsWith(value: string, message?: string): ZodString;
    transform<T>(fn: (value: string) => T): ZodType<T>;
    refine(check: (data: string) => boolean, message: string): ZodString;
  }

  export interface ZodNumber extends ZodType<number> {
    int(message?: string): ZodNumber;
    positive(message?: string): ZodNumber;
    nonnegative(message?: string): ZodNumber;
    max(max: number, message?: string): ZodNumber;
    default(value: number): ZodNumber;
    describe(description: string): ZodNumber;
    optional(): ZodOptional<ZodNumber>;
  }

  export interface ZodArray<T> extends ZodType<T[]> {
    min(length: number, message?: string): ZodArray<T>;
    max(length: number, message?: string): ZodArray<T>;
  }

  export interface ZodObject<T extends Record<string, any> = any> extends ZodType<T> {
    strict(): ZodObject<T>;
    optional(): ZodOptional<ZodObject<T>>;
    refine(check: (data: T) => boolean, message: string): ZodObject<T>;
    default(value: T): ZodObject<T>;
    shape: Record<string, ZodType>;
  }

  export interface ZodEnum<T extends [string, ...string[]]> extends ZodType<T[number]> {
    default(value: T[number]): ZodEnum<T>;
  }

  export namespace z {
    export const string: () => ZodString;
    export const number: () => ZodNumber;
    export const boolean: () => ZodBoolean;
    export const array: <T extends ZodType>(schema: T) => ZodArray<T['_output']>;
    export const object: <T extends Record<string, ZodType>>(shape: T) => ZodObject<{ [k in keyof T]: T[k]['_output'] }>;
    export const createEnum: <T extends [string, ...string[]]>(values: T) => ZodEnum<T>;
    export const literal: <T extends string | number | boolean>(value: T) => ZodLiteral<T>;
    export const union: <T extends [ZodType, ...ZodType[]]>(types: T) => ZodUnion<T>;
    export const intersection: <T extends [ZodType, ...ZodType[]]>(types: T) => ZodIntersection<T>;
    export const nullable: <T extends ZodType>(schema: T) => ZodNullable<T>;
    export const optional: <T extends ZodType>(schema: T) => ZodOptional<T>;
  }

  export interface ZodBoolean extends ZodType<boolean> {}
  export interface ZodLiteral<T> extends ZodType<T> {}
  export interface ZodUnion<T extends [ZodType, ...ZodType[]]> extends ZodType<T[number]['_output']> {}
  export interface ZodIntersection<T extends [ZodType, ...ZodType[]]> extends ZodType<T[number]['_output']> {}
  export interface ZodNullable<T extends ZodType> extends ZodType<T['_output'] | null> {}
  export interface ZodOptional<T extends ZodType> extends ZodType<T['_output'] | undefined> {
    default(value: T['_output']): ZodType<T['_output']>;
  }

  export interface ZodSchema<T = any> extends ZodType<T> {}

  export type infer<T extends ZodType> = T['_output'];
}