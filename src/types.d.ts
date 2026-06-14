declare module "*.html" {
  import { TemplateResult } from "lit";
  const content: (this: any) => TemplateResult;
  export default content;
}

declare module "*.scss" {
  import { CSSResult } from "lit";
  const content: CSSResult;
  export default content;
}