import { Vue, Component, Prop } from 'vue-facing-decorator';
import { h, VNode, VNodeChild } from 'vue';
import {Channel} from '../fchat';
import { Score } from '../learn/matcher';
import {BBCodeView} from '../bbcode/view';
import { formatTime } from './common';
import core from './core';
import {Conversation} from './interfaces';
import UserView from './UserView.vue';
import { Scoring } from '../learn/matcher-types';

const userPostfix: {[key: number]: string | undefined} = {
    [Conversation.Message.Type.Message]: ': ',
    [Conversation.Message.Type.Ad]: ': ',
    [Conversation.Message.Type.Action]: ''
};
@Component({
    render(this: MessageView): VNode {
        const message = this.message;

        const children: VNodeChild[] =
            [h('span', {staticClass: 'message-time'}, `${formatTime(message.time)}`)];

        const separators = core.connection.isOpen ? core.state.settings.messageSeparators : false;

        /*tslint:disable-next-line:prefer-template*///unreasonable here
        let classes =
            `message message-${Conversation.Message.Type[message.type].toLowerCase()}`
          + (separators ? ' message-block' : '')
          + (message.type !== Conversation.Message.Type.Event && message.sender.name === core.connection.character ? ' message-own' : '')
          + (this.classes !== undefined ? ` ${this.classes}` : '')
          + ` ${this.scoreClasses}`
          + ` ${this.filterClasses}`;

        function tryRisingPortrait() {
            try   { return core.state.settings.risingShowPortraitInMessage }
            catch { return false }
        }


        if  (message.type !== Conversation.Message.Type.Event) {
            children.push(
                message.type === Conversation.Message.Type.Action
                    ? h('i', { class: 'message-pre fas fa-star-of-life' })
                    : '',
                h(UserView, {
                    props: {
                        avatar: tryRisingPortrait(),
                        character: message.sender,
                        channel: this.channel,
                    }
                }),
                userPostfix[message.type] !== undefined
                    ? h('span', { class: 'message-post' }, userPostfix[message.type])
                    : ' '
            );

            if ('isHighlight' in message && message.isHighlight) classes += ' message-highlight';
        }

        const isAd = message.type === Conversation.Message.Type.Ad && !this.logs;

        children.push(
            h(
                BBCodeView(core.bbCodeParser),
                { props: {
                    unsafeText: message.text,
                    afterInsert: isAd
                        ? (elm: HTMLElement) => {
                            setImmediate(() => {
                                elm = elm.parentElement!;

                                if (elm.scrollHeight > elm.offsetHeight) {
                                    const expand = document.createElement('div');

                                    expand.className = 'expand fas fa-caret-down';

                                    expand.addEventListener('click', function(): void { this.parentElement!.className += ' expanded'; });

                                    elm.appendChild(expand);
                                }
                            });
                        }
                        : undefined
                }}
            )
        );

        const node = h('div', {attrs: { class: classes }}, children);
        node.key = message.id;

        return node;
    }
})
export default class MessageView extends Vue {
    @Prop({ required: true })
    readonly message!: Conversation.Message;
    @Prop({ default: '' })
    readonly classes!: string;
    @Prop({ default: null })
    readonly channel!: Channel | null;
    @Prop({ default: false })
    readonly logs!: boolean;

    scoreClasses!: string;
    filterClasses!: string;

    scoreWatcher = (this.message.type === Conversation.Message.Type.Ad && this.message.score === 0)
        ? this.$watch('message.score', () => this.scoreUpdate())
        : null;


    //@Hook('created')
    created(): void {
        this.scoreClasses = this.getMessageScoreClasses(this.message);
        this.filterClasses = this.getMessageFilterClasses(this.message);
    }

    //@Hook('beforeUnmount')
    beforeUnmount(): void {
        if (this.scoreWatcher) {
            this.scoreWatcher(); // invoke watch stopper
            this.scoreWatcher = null;
        }
    }

    // @Watch('message.score')
    scoreUpdate(): void {
        const oldScoreClasses  = this.scoreClasses;
        const oldFilterClasses = this.filterClasses;

        this.scoreClasses  = this.getMessageScoreClasses(this.message);
        this.filterClasses = this.getMessageFilterClasses(this.message);

        if (this.scoreClasses !== oldScoreClasses || this.filterClasses !== oldFilterClasses) {
            this.$forceUpdate();
        }

        if (this.scoreWatcher) {
            this.scoreWatcher(); // stop watching
            this.scoreWatcher = null;
        }
    }

    getMessageScoreClasses(message: Conversation.Message): string {
        try {
            if (message.type !== Conversation.Message.Type.Ad
             || !core.state.settings.risingAdScore)
                    return '';
        }
        catch { return '' }

        return `message-score ${Score.getClasses(message.score as Scoring)}`;
    }

    getMessageFilterClasses(message: Conversation.Message): string {
        if (!message.filterMatch)
            return '';
        else
            return 'filter-match';
    }
}
