import type Vue from 'vue';
import type { BBCodeElement } from '../bbcode/core';
import { CoreBBCodeParser, analyzeUrlTag } from '../bbcode/core';
import BaseEditor from '../bbcode/Editor.vue';
import { BBCodeTextTag } from '../bbcode/parser';
import ChannelView from './ChannelTagView.vue';
// import {characterImage} from './common';
import core from './core';
// import {Character} from './interfaces';
import UrlTagView from '../bbcode/UrlTagView.vue';
import IconView from '../bbcode/IconView.vue';
import UserView from './UserView.vue';

export class Editor extends BaseEditor {
    parser = core.bbCodeParser;
}

export default class BBCodeParser extends CoreBBCodeParser {
    cleanup: Vue[] = [];

    constructor() {
        super();
        this.addTag(new BBCodeTextTag('user', (parser, parent, param, content) => {
            if (param.length > 0)
                parser.warning('Unexpected parameter on user tag.');

            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(content))
                return;

            const el = parser.createElement('span');
            parent.appendChild(el);

            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call */
            const view = new UserView({
                el,
                propsData: { character: core.characters.get(content) },
            }) as Vue;

            this.cleanup.push(view);

            return el;
        }));
        this.addTag(new BBCodeTextTag('icon', (parser, parent, param, content) => {
            if (param.length > 0)
                parser.warning('Unexpected parameter on icon tag.');

            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(content))
                return;

            const root = parser.createElement('span');
            const el = parser.createElement('span');

            parent.appendChild(root);
            root.appendChild(el);

            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call */
            const view = new IconView({
                el,
                propsData: { character: content },
            }) as Vue;

            this.cleanup.push(view);
            return root;

            /* const img = parser.createElement('img');
            img.src = characterImage(content);
            img.style.cursor = 'pointer';
            img.className = 'character-avatar icon';
            img.title = img.alt = content;
            (<HTMLImageElement & {character: Character}>img).character = core.characters.get(content);
            parent.appendChild(img);
            return img; */
        }));
        this.addTag(new BBCodeTextTag('eicon', (parser, parent, param, content) => {
            if (param.length > 0)
                parser.warning('Unexpected parameter on eicon tag.');

            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(content))
                return;

            const extension = core.connection.isOpen && !core.state.settings.animatedEicons ? 'png' : 'gif';
            const img = parser.createElement('img');
            img.src = `https://static.f-list.net/images/eicon/${content.toLowerCase()}.${extension}`;
            img.title = img.alt = content;

            // Property for right click menu. Should move type into interfaces.
            (img as HTMLImageElement & { eicon: string }).eicon = content;

            img.className = 'character-avatar icon';
            parent.appendChild(img);
            return img;
        }));
        this.addTag(new BBCodeTextTag('session', (parser, parent, param, content) => {
            const root = parser.createElement('span');
            const el = parser.createElement('span');

            parent.appendChild(root);
            root.appendChild(el);

            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call */
            const view = new ChannelView({
                el,
                propsData: { id: content, text: param },
            }) as Vue;

            this.cleanup.push(view);

            return root;
        }));
        this.addTag(new BBCodeTextTag('channel', (parser, parent, _, content) => {
            const root = parser.createElement('span');
            const el = parser.createElement('span');

            parent.appendChild(root);
            root.appendChild(el);

            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call */
            const view = new ChannelView({
                el,
                propsData: { id: content, text: content },
            }) as Vue;

            this.cleanup.push(view);

            return root;
        }));

        this.addTag(new BBCodeTextTag(
            'url',
            (parser, parent, _, content) => {
                const tag_data = analyzeUrlTag(parser, _, content);

                const root = parser.createElement('span');
                // const el = parser.createElement('span');

                parent.appendChild(root);
                // root.appendChild(el);

                if (!tag_data.success) {
                    root.textContent = tag_data.textContent;
                    return;
                }

                /* eslint-disable-next-line @typescript-eslint/no-unsafe-call */
                const view = new UrlTagView({
                    el:        root,
                    propsData: {
                        url:    tag_data.url,
                        text:   tag_data.textContent,
                        domain: tag_data.domain,
                    },
                }) as Vue;

                this.cleanup.push(view);

                return root;
            }));
    }

    parseEverything(input: string): BBCodeElement {
        const elm = super.parseEverything(input);

        if (this.cleanup.length > 0) {
            (elm as BBCodeElement).cleanup = ((cleanup: Vue[]) => () => {
                for (const component of cleanup)
                    component.$destroy();
            })(this.cleanup);
        }

        this.cleanup = [];

        return elm;
    }
}
