declare module 'draftjs-to-html' {
  import { RawDraftContentState } from 'draft-js';
  function draftToHtml(rawContentState: RawDraftContentState, hashtagConfig?: object, directional?: boolean, customEntityTransform?: Function): string;
  export default draftToHtml;
}
