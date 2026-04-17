import type Vue from 'vue';
import type { BBCodeElement } from './core';
import type { InlineImage } from '../interfaces';
import { InlineDisplayMode } from '../interfaces';
import * as Utils from '../site/utils';
import { analyzeUrlTag, CoreBBCodeParser } from './core';
import { BBCodeCustomTag, BBCodeSimpleTag, BBCodeTextTag } from './parser';
import UrlTagView from './UrlTagView.vue';
import IconView from '../bbcode/IconView.vue';

const username_regex = /^[a-zA-Z0-9_\-\s]+$/;

export class StandardBBCodeParser extends CoreBBCodeParser {
    inlines: { [key: string]: InlineImage | undefined } | undefined;

    cleanup: Vue[] = [];

    createInline(inline: InlineImage): HTMLElement {
        const p1 = inline.hash.substring(0, 2);
        const p2 = inline.hash.substring(2, 4);

        const outer = this.createElement('div');
        const inner = this.createElement('img');

        inner.className = 'inline-image';
        inner.title = inner.alt = inline.name;
        inner.src = `${Utils.staticDomain}images/charinline/${p1}/${p2}/${inline.hash}.${inline.extension}`;
        outer.appendChild(inner);

        return outer;
    }

    /* eslint-disable @stylistic/array-element-newline */
    constructor() {
        super();
        const hr = new BBCodeSimpleTag('hr', 'hr', [], []);
        hr.noClosingTag = true;
        this.addTag(hr);
        this.addTag(new BBCodeCustomTag('quote', (parser, parent, param) => {
            if (param !== '')
                parser.warning('Unexpected paramter on quote tag.');
            const outer = parser.createElement('blockquote');
            const inner = parser.createElement('div');
            inner.className = 'quoteHeader';
            inner.appendChild(document.createTextNode('Quote:'));
            outer.appendChild(inner);
            parent.appendChild(outer);
            return outer;
        }));
        this.addTag(new BBCodeSimpleTag('left',    'span', [ 'leftText'    ]));
        this.addTag(new BBCodeSimpleTag('right',   'span', [ 'rightText'   ]));
        this.addTag(new BBCodeSimpleTag('center',  'span', [ 'centerText'  ]));
        this.addTag(new BBCodeSimpleTag('justify', 'span', [ 'justifyText' ]));
        this.addTag(new BBCodeSimpleTag(
            'big',
            'span',
            [ 'bigText' ],
            [ 'url', 'i', 'u', 'b', 'color', 's' ]
        ));
        this.addTag(new BBCodeSimpleTag(
            'small',
            'span',
            [ 'smallText' ],
            [ 'url', 'i', 'u', 'b', 'color', 's' ]
        ));
        this.addTag(new BBCodeSimpleTag(
            'sub',
            'span',
            [ 'smallText' ],
            [ 'url', 'i', 'u', 'b', 'color', 's' ]
        ));
        this.addTag(new BBCodeSimpleTag('indent', 'div', [ 'indentText' ]));
        this.addTag(new BBCodeSimpleTag(
            'heading',
            'h2',
            [],
            [ 'collapse', 'justify', 'center', 'left', 'right', 'url', 'i', 'u', 'b', 'color', 's', 'big', 'sub' ]
        ));
        this.addTag(new BBCodeSimpleTag('row', 'div', [ 'row' ]));
        this.addTag(new BBCodeCustomTag('col', (parser, parent, param) => {
            const col = parser.createElement('div');
            col.className = param === '1' ? 'col-lg-3 col-md-4 col-12' : param === '2' ? 'col-lg-4 col-md-6 col-12' :
                param === '3' ? 'col-lg-6 col-md-8 col-12' : 'col-md';
            parent.appendChild(col);
            return col;
        }));
        this.addTag(new BBCodeCustomTag('collapse', (parser, parent, param) => {
            if (param === '')
                parser.warning('title parameter is required.');

            const outer = parser.createElement('div');
            outer.className = 'card bg-light bbcode-collapse';
            const header = parser.createElement('div');
            header.className = 'card-header bbcode-collapse-header';
            const icon = parser.createElement('i');
            icon.className = 'fas fa-chevron-down';
            icon.style.marginRight = '10px';

            // HACK: to allow [hr] in header part
            if (param.startsWith('[hr]')) {
                header.appendChild(parser.createElement('hr'));
                param = param.slice(4);
            }

            header.appendChild(icon);

            const split = param.split('[hr]');
            for (let iii = 0; iii < split.length; iii++) {
                const element = split[iii] ?? '';
                header.appendChild(document.createTextNode(element));
                if (iii < split.length-1)
                    header.appendChild(parser.createElement('hr'));
            }
            outer.appendChild(header);

            const body = parser.createElement('div');
            body.className = 'bbcode-collapse-body';
            body.style.height = '0';
            outer.appendChild(body);

            const inner = parser.createElement('div');
            inner.className = 'card-body';
            body.appendChild(inner);

            let timeout: number;
            header.addEventListener('click', () => {
                const collapsed = parseInt(body.style.height, 10) === 0;
                if (collapsed) {
                    timeout = window.setTimeout(() => body.style.height = '', 200);
                }
                else {
                    clearTimeout(timeout);
                    body.style.transition = 'initial';
                    setImmediate(() => {
                        body.style.transition = '';
                        body.style.height = '0';
                    });
                }
                body.style.height = `${body.scrollHeight}px`;
                icon.className = `fas fa-chevron-${collapsed ? 'up' : 'down'}`;
            });
            parent.appendChild(outer);
            return inner;
        }));
        this.addTag(new BBCodeTextTag('user', (parser, parent, param, content) => {
            if (param !== '')
                parser.warning('Unexpected parameter on user tag.');
            if (!username_regex.test(content))
                return;
            const a = parser.createElement('a');
            a.href = `${Utils.siteDomain}c/${content}`;
            a.target = '_blank';
            a.className = 'character-link';
            a.appendChild(document.createTextNode(content));
            parent.appendChild(a);
            return a;
        }));
        this.addTag(new BBCodeTextTag('icon', (parser, parent, param, content) => {
            if (param !== '')
                parser.warning('Unexpected parameter on icon tag.');
            if (!username_regex.test(content))
                return;

            const root = parser.createElement('span');
            const el = parser.createElement('span');
            parent.appendChild(root);
            root.appendChild(el);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const view = new IconView({
                el,
                propsData: { character: content },
            }) as Vue;

            this.cleanup.push(view);
            return root;

            // const a = parser.createElement('a');
            // a.href = `${Utils.siteDomain}c/${content}`;
            // a.target = '_blank';
            // const img = parser.createElement('img');
            // img.src = `${Utils.staticDomain}images/avatar/${content.toLowerCase()}.png`;
            // img.className = 'character-avatar icon';
            // img.title = img.alt = content;
            // a.appendChild(img);
            // parent.appendChild(a);
            // return a;
        }));
        this.addTag(new BBCodeTextTag('eicon', (parser, parent, param, content) => {
            if (param !== '')
                parser.warning('Unexpected parameter on eicon tag.');

            if (!username_regex.test(content))
                return;
            let extension = '.gif';
            if (!Utils.settings.animateEicons)
                extension = '.png';
            const img = parser.createElement('img');
            img.src = `${Utils.staticDomain}images/eicon/${content.toLowerCase()}${extension}`;
            img.className = 'character-avatar icon';
            img.title = img.alt = content;

            // Property for right click menu.
            // TODO: This should be a stronger type, defined in a canonical place.
            (img as typeof img & { eicon?: string }).eicon = content;

            parent.appendChild(img);
            return img;
        }));
        this.addTag(new BBCodeTextTag('img', (p, parent, param, content) => {
            const parser = <StandardBBCodeParser>p;
            if (typeof parser.inlines === 'undefined') {
                parser.warning('This page does not support inline images.');
                return undefined;
            }

            if (!/^\d+$/.test(param)) {
                parser.warning('img tag parameters must be numbers.');
                return undefined;
            }

            const inline = parser.inlines[param];
            if (typeof inline !== 'object') {
                parser.warning(`Could not find an inline image with id ${param} It will not be visible.`);
                return undefined;
            }

            inline.name = content;
            let element: HTMLElement;

            const display_mode = Utils.settings.inlineDisplayMode;
            if (display_mode === InlineDisplayMode.None || (display_mode === InlineDisplayMode.Sfw && inline.nsfw)) {
                const el = element = parser.createElement('a');
                el.className = 'unloadedInline';
                el.href = '#';
                el.dataset.inlineId = param;
                el.onclick = () => {
                    const inlines = document.getElementsByClassName('unloadedInline');
                    for (const inline of inlines) {
                        // TODO: Inlines should be hard-typed to contain inlineIds in their dataset
                        const i = inline as HTMLElement & { dataset: { inlineId?: string }};

                        if (!parser.inlines || !i.dataset.inlineId)
                            continue;

                        const image = parser.inlines[i.dataset.inlineId];
                        if (!image)
                            continue;

                        if (inline.parentElement)
                            inline.parentElement.replaceChild(parser.createInline(image), inline);
                    }

                    return false;
                };
                const prefix = inline.nsfw ? '[NSFW Inline] ' : '[Inline] ';
                el.appendChild(document.createTextNode(prefix));
                parent.appendChild(el);
            }
            else {
                parent.appendChild(element = parser.createInline(inline));
            }
            return element;
        }));

        this.addTag(new BBCodeTextTag('url', (parser, parent, _, content) => {
            const tag_data = analyzeUrlTag(parser, _, content);
            const root = parser.createElement('span');

            parent.appendChild(root);

            // root.appendChild(el);

            if (!tag_data.success) {
                root.textContent = tag_data.textContent;
                return;
            }

            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call */
            const view = new UrlTagView({
                el:        root,
                propsData: { url: tag_data.url, text: tag_data.textContent, domain: tag_data.domain },
            }) as Vue;

            this.cleanup.push(view);

            return root;
        }));
    } /* eslint-enable @stylistic/array-element-newline */


    parseEverything(input: string): BBCodeElement {
        const elm = super.parseEverything(input) as BBCodeElement;

        if (this.cleanup.length > 0) {
            elm.cleanup = ((cleanup: Vue[]) => () => {
                for (const component of cleanup)
                    component.$destroy();
            })(this.cleanup);
        }

        this.cleanup = [];

        return elm;
    }
}
