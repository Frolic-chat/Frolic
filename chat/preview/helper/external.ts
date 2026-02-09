import { ImageUrlMutator } from '../image-url-mutator';
import { ImagePreviewHelper } from './helper';

export class ExternalImagePreviewHelper extends ImagePreviewHelper {
    protected lastExternalUrl: string | undefined = undefined;

    protected allowCachedUrl = true;

    protected urlMutator = new ImageUrlMutator(this.parent.debug);

    protected ratio: number | null = null;

    hide(): void {
        const wasVisible = this.visible;

        if (this.parent.debug)
            console.log('ImagePreview: exec hide mutator');

        if (wasVisible) {
            const webview = this.parent.getWebview();

            // if (this.allowCachedUrl) {
            //     void webview.executeJavaScript(this.parent.jsMutator.getHideMutator());
            // } else {

            webview.stop();
            webview.setAudioMuted(true);

            webview.loadURL('about:blank')
                .catch((err: any) => console.warn('webview.loadURL() in hide()', err));

            //}

            this.visible = false;
        }
    }


    setRatio(ratio: number): void {
        this.ratio = ratio;
    }


    getName(): string {
        return 'ExternalImagePreviewHelper';
    }


    reactsToSizeUpdates(): boolean {
        return true;
    }


    shouldTrackLoading(): boolean {
        return true;
    }


    usesWebView(): boolean {
        return true;
    }


    setDebug(debug: boolean): void {
        this.debug = debug;

        this.urlMutator.setDebug(debug);
    }


    show(url: string | undefined): void {
        const webview = this.parent.getWebview();

        if (!this.parent) {
            throw new Error('Empty parent v2');
        }

        if (!webview) {
            throw new Error('Empty webview!');
        }

        if (!url) {
            throw new Error('Empty URL!');
        }

        // const oldUrl = this.url;
        // const oldLastExternalUrl = this.lastExternalUrl;

        this.url = url;
        this.lastExternalUrl = url;
        this.visible = true;

        try {
            // if ((this.allowCachedUrl) && ((webview.getURL() === url) || (url === oldLastExternalUrl))) {
            //     if (this.debug)
            //         console.log('ImagePreview: exec re-show mutator');
            //
            //     void webview.executeJavaScript(this.parent.jsMutator.getReShowMutator());
            // } else {
            //     if (this.debug)
            //         console.log('ImagePreview: must load; skip re-show because urls don\'t match', this.url, webview.getURL());

            this.ratio = null;

            webview.stop();
            webview.setAudioMuted(false);

            // Broken promise chain on purpose
            void this.urlMutator.resolve(url)
                .then(
                    async(finalUrl: string) => {
                        if (this.debug)
                            console.log('ImagePreview: must load', finalUrl, this.url, webview.getURL());

                        webview.stop();

                        await webview.loadURL(finalUrl);
                    }
                )
                .catch(
                    (err: any) => {
                        // Standard error when closing the image viewer while it's trying to load an image.
                        if (!err.message.includes('ERR_FAILED (-2)'))
                            console.warn('webview.loadURL() in show()', typeof err, { err });
                    }
                );

            // }
        } catch (err) {
            console.error('ImagePreview: Webview reuse error', err);
        }
    }


    match(domainName: string | undefined, url: string | undefined): boolean {
        if ((!domainName) || (!url)) {
            return false;
        }

        return (ImagePreviewHelper.HTTP_TESTER.test(url))
            && (!((domainName === 'f-list.net') || (domainName === 'static.f-list.net')));
    }


    determineScalingRatio(): Record<string, any> {
        // ratio = width / height
        const ratio = this.ratio;

        if (!ratio) {
            return {};
        }

        const ww = window.innerWidth;
        const wh = window.innerHeight;

        // Using the .w-XX-## settings we pre-programmed to match bootstrap for the character preview
        const scale =
            ww >= 1200 ? 0.5  // w-xl-50
                : ww >= 992 ? 0.6 // w-lg-60
                    : ww >= 768 ? 0.7 // w-md-70
                        : ww >= 576 ? 0.8 // w-sm-80
                            : 1.0;            // w-xs-100

        if (ratio >= 1) {
            const maxWidth = Math.round(ww * scale);
            const presumedHeight = maxWidth / ratio;

            return {
                width:  `${maxWidth}px`,
                height: `${presumedHeight}px`,
            };
        }
        else {
            // Preserve the 70% height vs 50% width from legacy
            const breakpoint_h = (scale * 1.4 > 1)
                ? 1 : scale * 1.4;

            const maxHeight = Math.round(wh * breakpoint_h);
            const presumedWidth = maxHeight * ratio;

            return {
                width:  `${presumedWidth}px`,
                height: `${maxHeight}px`,
            };
        }
    }


    renderStyle(): Record<string, any> {
        return this.isVisible()
            ? { display: 'flex', ...this.determineScalingRatio() }
            : { display: 'none' };
    }
}
