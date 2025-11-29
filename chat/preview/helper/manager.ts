import { ImagePreviewHelper } from './helper';
import ImagePreview from '../ContentPreview.vue';

export type RenderStyle = Record<string, any>;

export interface PreviewManagerHelper {
  helper: ImagePreviewHelper;
  renderStyle: RenderStyle;
}


export class PreviewManager {
  private parent: ImagePreview;

  private helpers: PreviewManagerHelper[];

  private debugMode = false;

  constructor(parent: ImagePreview, helperInstances: ImagePreviewHelper[]) {
      this.parent = parent;
      this.helpers = helperInstances.map(helper => ({ helper, renderStyle: {} }));
  }

  match(domain: string | undefined, url: string | undefined): PreviewManagerHelper | undefined {
      return this.helpers.find(h => h.helper.match(domain, url));
  }

  matchIndex(domain: string | undefined, url: string | undefined): number {
      return this.helpers.findIndex(h => h.helper.match(domain, url));
  }

  renderStyles(): Record<string, RenderStyle> {
      this.helpers.forEach(h => {
          h.renderStyle = h.helper.renderStyle();

          this.debugLog('ImagePreview: pm.renderStyles()', h.helper.constructor.name, JSON.parse(JSON.stringify(h.renderStyle)));
      });

      return Object.fromEntries(this.helpers.map(h => ([ h.helper.getName(), h.renderStyle ])));
  }

  getVisiblePreview(): ImagePreviewHelper | undefined {
      return this.helpers.find(h => h.helper.isVisible())?.helper;
  }


  show(url: string | undefined, domain: string | undefined): ImagePreviewHelper | undefined {
    const matchedHelper = this.match(domain, url);

    this.helpers
        .filter(h => h !== matchedHelper)
        .forEach(h => h.helper.hide());

    if (!matchedHelper) {
      this.debugLog('ImagePreview: pm.show()', 'Unmatched helper', url, domain);
      return undefined;
    }

    matchedHelper.helper.show(url);
    return matchedHelper.helper;
  }


  hide(): void {
      this.helpers.forEach(h => {
          this.debugLog('ImagePreview: pm.hide()', h.helper.constructor.name, h.helper.isVisible());
          h.helper.hide();
      });
  }


  getVisibilityStatus(): Record<string, boolean> {
      return Object.fromEntries(this.helpers.map(h => [ h.helper.constructor.name, h.helper.isVisible() ]));
  }


  setDebug(debugMode: boolean): void {
      this.helpers.forEach(h => h.helper.setDebug(debugMode));
      this.debugMode = debugMode;
  }


  debugLog(...messages: any[]): void {
      if (this.debugMode)
          this.parent.debugLog(...messages);
  }
}
