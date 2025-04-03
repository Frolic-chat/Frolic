<template>
    <div class="sidebar-wrapper" :class="{open: expanded}">
        <div :class="'sidebar sidebar-' + (right ? 'right' : 'left')">
            <button @click="onButtonClick()" class="btn btn-secondary btn-xs expander" :aria-label="label">
                <span v-if="right"
                    :class="note_icon"
                    class="fa fa-rotate-270"
                ></span>
                <span
                    :class="{'fa-chevron-down': !expanded, 'fa-chevron-up': expanded}"
                    class="fa fa-fw"
                ></span>
                <span v-if="!right"
                    :class="room_icon"
                    class="fa fa-fw fa-rotate-90"
                ></span>
                <span v-if="!right"
                    :class="pm_icon"
                    class="fa fa-rotate-90"
                ></span>
            </button>
            <div class="body">
                <slot></slot>
            </div>
        </div>
        <div class="modal-backdrop show" @click="onButtonClick()"></div>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Hook} from '@f-list/vue-ts';
    import Vue from 'vue';
    import core from './core';
    import { EventBus, SelectConversationEvent, ChannelMessageEvent, PrivateMessageEvent } from './preview/event-bus';
    import { Conversation } from './interfaces';
    import log from 'electron-log';

    const NoneUnread    = Conversation.UnreadState.None;
    const UnreadUnread  = Conversation.UnreadState.Unread;
    const MentionUnread = Conversation.UnreadState.Mention;

    type UnreadStatusKey = Record<Conversation.UnreadState, string>;

    const PrivIcon: UnreadStatusKey = {
        [NoneUnread]:    '', // valid; disappears
        [UnreadUnread]:  'far fa-fw fa-comment-dots',
        [MentionUnread]: 'far fa-fw fa-comment-dots mention',
    }
    const RoomIcon: UnreadStatusKey = {
        [NoneUnread]:    '', // set during mount
        [UnreadUnread]:  'far fa-fw fa-list-alt',
        [MentionUnread]: 'far fa-fw fa-list-alt mention',
    }

    const watched_pms:   {[name: string]: Conversation.UnreadState} = {};
    const watched_rooms: {[name: string]: Conversation.UnreadState} = {};

    const NoteIcon: Record<number, string> = {
        0: '', // set during mount
        1: 'fa-fw fa-envelope',
        2: 'fa-fw fa-rss-square',
        3: 'fa-fw fa-mail-bulk',
    };

    @Component
    export default class Sidebar extends Vue {
        @Prop
        readonly right?: true;
        @Prop
        readonly label?: string;
        @Prop({required: true})
        readonly icon!: string;
        @Prop({default: false})
        readonly open!: boolean;
        expanded = this.open;

        onButtonClick() {
            this.expanded = !this.expanded;

            if (this.right)
                this.updateNoteDisplay();

            log.silly('sidebar.toggle.button', {expanded: this.expanded, right: this.right});
        }

        pm_icon:   string = '';
        room_icon: string = '';
        note_icon: string = '';

        onPrivateMessage(pmEvent: PrivateMessageEvent): void {
            const conv = pmEvent.conv;

            if (conv === core.conversations.selectedConversation)
                return;

            if (conv.unread === UnreadUnread) {
                if (this.pm_icon === PrivIcon[NoneUnread])
                    this.pm_icon = PrivIcon[UnreadUnread];

                watched_pms[conv.name] = conv.unread;
                log.debug('sidebar.msg.priv.unread', watched_rooms);
            }
            else if (conv.unread === MentionUnread) {
                if (this.pm_icon !== PrivIcon[MentionUnread])
                    this.pm_icon = PrivIcon[MentionUnread];

                watched_pms[conv.name] = conv.unread;
                log.debug('sidebar.msg.priv.mention', watched_pms);
            }
        };

        onChannelMessage(roomEvent: ChannelMessageEvent): void {
            const conv = roomEvent.channel;

            //if (Conversation.isChannel(selected) && convos.indexOf(conv) === convos.indexOf(selected))
            //if (Conversation.isChannel(selected) && conv === selected)
            if (conv === core.conversations.selectedConversation)
                return;

            if (conv.unread === UnreadUnread) {
                if (this.room_icon === RoomIcon[NoneUnread])
                    this.room_icon = RoomIcon[conv.unread];

                watched_rooms[conv.name] = conv.unread;
                log.debug('sidebar.msg.room.unread', watched_rooms);
            }
            else if (conv.unread === MentionUnread) {
                if (this.room_icon !== RoomIcon[MentionUnread])
                    this.room_icon = RoomIcon[conv.unread];

                watched_rooms[conv.name] = conv.unread;
                log.debug('sidebar.msg.room.mention', watched_rooms);
            }
        }

        onConversationSelect(convEvent: SelectConversationEvent): void {
            if (convEvent.conversation === null)
                return;

            const conversation = convEvent.conversation;

            if (Conversation.isPrivate(conversation)) {
                if (watched_pms[conversation.name])
                    delete watched_pms[conversation.name];

                let highest: Conversation.UnreadState = NoneUnread;
                for (const state of Object.values(watched_pms)) {
                    if (state === MentionUnread) {
                        highest = MentionUnread;
                        log.debug('sidebar.select.priv.highest', highest, watched_pms);
                        break;
                    }
                    else if (state === UnreadUnread && highest === NoneUnread) {
                        highest = UnreadUnread;
                    }
                }
                this.pm_icon = PrivIcon[highest];
                log.debug('sidebar.select.priv.fallthrough', highest, watched_pms);
            }
            else { // Room message
                if (watched_rooms[conversation.name])
                    delete watched_rooms[conversation.name]

                let highest: Conversation.UnreadState = NoneUnread;
                for (const [_, state] of Object.entries(watched_rooms)) {
                    if (state === MentionUnread) {
                        highest = MentionUnread;
                        log.debug('sidebar.select.room.highest', highest, watched_rooms);
                        break;
                    }
                    else if (state === UnreadUnread && highest === NoneUnread) {
                        highest = UnreadUnread;
                    }
                }
                // Room icon arbitrarily decided to display the default icon when not busy.
                this.room_icon = highest === NoneUnread ? this.icon : RoomIcon[highest];
                log.debug('sidebar.select.room.fallthrough', highest, watched_rooms);
            }
        }

        updateNoteDisplay(): void {
            if (this.expanded) {
                this.note_icon = this.icon;
                return;
            }

            const count = core.siteSession.interfaces.notes.getCounts();
            const sum = (count.unreadNotes    > 0 && 1 || 0)
                      + (count.unreadMessages > 0 && 2 || 0);

            this.note_icon = NoteIcon[sum || 0];
            log.debug('sidebar.note.update');
        };

        @Hook('mounted')
        mounted(): void {
            if (this.right) {
                NoteIcon[0] = this.icon;
                this.updateNoteDisplay();

                EventBus.$on('note-counts-update', this.updateNoteDisplay);
                log.debug('sidebar.mount.right.success', { right: this.right, icon: this.icon, note: this.note_icon });
            }
            else { // left
                RoomIcon[NoneUnread] = this.icon;
                this.room_icon = RoomIcon[NoneUnread];

                EventBus.$on('private-message-post', this.onPrivateMessage);
                EventBus.$on('channel-message-post', this.onChannelMessage);
                EventBus.$on('select-conversation',  this.onConversationSelect);
                log.debug('sidebar.mount.left.success', { right: this.right, icon: this.icon, room: this.room_icon, priv: this.pm_icon });
            }
        }
    }
</script>

<style lang="scss">
    .sidebar {
        button:focus {
            box-shadow: none;
        }

        .mention {
            color: var(--danger);
        }

        .fa-comment-dots, .fa-mail-bulk, .fa-rss-square, .fa-envelope {
            color: var(--warning);
        }
    }
</style>
