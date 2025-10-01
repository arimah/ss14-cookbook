declare const IS_DEV: boolean;
declare const BASE_PATH: string;
declare const REPO_URL: string;
declare const TRUSTED_HOSTS: string[];
declare const CANONICAL_URL: string | null;

declare module '*.css' {
  const ClassMap: {
    [key: string]: string;
  };
  export = ClassMap;
}
