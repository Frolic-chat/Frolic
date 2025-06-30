import { h, render, VNode } from 'vue';
import {BBCodeElement, CoreBBCodeParser, analyzeUrlTag} from '../bbcode/core';
//tslint:disable-next-line:match-default-export-name
import {BBCodeTextTag} from '../bbcode/parser';
import ChannelView from './ChannelTagView.vue';
// import {characterImage} from './common';
import core from './core';
// import {Character} from './interfaces';
import {default as UrlView} from '../bbcode/UrlTagView.vue';
import {default as IconView} from '../bbcode/IconView.vue';
import UserView from './UserView.vue';

export default class BBCodeParser extends CoreBBCodeParser {
    cleanup: VNode[] = [];
    trashcan: HTMLElement[] = [];

    constructor() {
        super();
        this.addTag(new BBCodeTextTag('user', (parser, parent, param, content) => {
            if(param.length > 0)
                parser.warning('Unexpected parameter on user tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if(!uregex.test(content)) return;
            const el = parser.createElement('span');
            parent.appendChild(el);
            // Vue 2
            //const view = new UserView({el, propsData: {character: core.characters.get(content)}});
            const view = h(UserView, {
                ref: 'userView',
                props: { character: core.characters.get(content)},
            });
            render(view, el);

            this.cleanup.push(view);
            this.trashcan.push(el);
            return el;
        }));
        this.addTag(new BBCodeTextTag('icon', (parser, parent, param, content) => {
            if(param.length > 0)
                parser.warning('Unexpected parameter on icon tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if(!uregex.test(content))
                return;

            const root = parser.createElement('span');
            const el = parser.createElement('span');
            parent.appendChild(root);
            root.appendChild(el);
            // Vue 2
            //const view = new IconView({ el, propsData: { character: content }});
            const view = h(IconView, {
                ref: 'iconView',
                props: { character: content },
            });
            render(view, el);

            this.cleanup.push(view);
            this.trashcan.push(el);
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
            if(param.length > 0)
                parser.warning('Unexpected parameter on eicon tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if(!uregex.test(content))
                return;
            const extension = core.connection.isOpen && !core.state.settings.animatedEicons ? 'png' : 'gif';
            const img = parser.createElement('img');
            img.src = `https://static.f-list.net/images/eicon/${content.toLowerCase()}.${extension}`;
            img.title = img.alt = content;
            img.className = 'character-avatar icon';
            parent.appendChild(img);
            return img;
        }));
        this.addTag(new BBCodeTextTag('session', (parser, parent, param, content) => {
            const root = parser.createElement('span');
            const el = parser.createElement('span');
            parent.appendChild(root);
            root.appendChild(el);
            // Vue 2
            //const view = new ChannelView({el, propsData: {id: content, text: param}});
            const view = h(ChannelView, {
                ref: 'channelView',
                props: { id: content, text: param },
            });
            render(view, el);

            this.cleanup.push(view);
            this.trashcan.push(el);
            return root;
        }));
        this.addTag(new BBCodeTextTag('channel', (parser, parent, _, content) => {
            const root = parser.createElement('span');
            const el = parser.createElement('span');
            parent.appendChild(root);
            root.appendChild(el);
            // Vue 2
            //const view = new ChannelView({el, propsData: {id: content, text: content}});
            const view = h(ChannelView, {
                ref: 'channelView',
                props: { id: content, text: content },
            });
            render(view, el);

            this.cleanup.push(view);
            this.trashcan.push(el);
            return root;
        }));

        this.addTag(new BBCodeTextTag(
            'url',
            (parser, parent, _, content) => {
                const tagData = analyzeUrlTag(parser, _, content);

                const root = parser.createElement('span');
                // const el = parser.createElement('span');
                parent.appendChild(root);
                // root.appendChild(el);

                if (!tagData.success) {
                    root.textContent = tagData.textContent;
                    return;
                }

                // Vue 2
                // const view = new UrlView({el: root, propsData: {url: tagData.url, text: tagData.textContent, domain: tagData.domain}});
                const view = h(UrlView, {
                    ref: 'urlView',
                    props: {
                        url: tagData.url,
                        text: tagData.textContent,
                        domain: tagData.domain,
                    },
                });
                render(view, root);

                this.cleanup.push(view);
                this.trashcan.push(root);
                return root;
            }));
    }

    parseEverything(input: string): BBCodeElement {
        const elm = <BBCodeElement>super.parseEverything(input);
        if(this.cleanup.length > 0)
            elm.cleanup = ((cleanup: HTMLElement[]) => () => {
                for (const component of cleanup)
                    render(null, component);
            })(this.trashcan);
        this.cleanup = [];
        this.trashcan = [];
        return elm;
    }
}
