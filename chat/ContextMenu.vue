<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <div>
        <user-menu ref="userMenu" @toggleMenu="setContextMenuShown" :reportDialog="reportDialog"></user-menu>
        <eicon-menu ref="eiconMenu" @toggleMenu="setContextMenuShown"></eicon-menu>
        <div class="modal-backdrop show usermenu-backdrop" v-show="showContextMenu"></div>
    </div>
</template>

<script lang="ts">
import { Component, Prop } from '@f-list/vue-ts';
import Vue from 'vue';
import { BBCodeView } from '../bbcode/view';
import core from './core';
import l from './localize';

import type { Channel, Character } from './interfaces';
import type ReportDialog from './ReportDialog.vue';

import UserMenu from './UserMenu.vue';
import EiconMenu from './EiconMenu.vue';

import NewLogger from '../helpers/log';
const log = NewLogger('user-menu');

@Component({
        components: {
            bbcode: BBCodeView(core.bbCodeParser),
            'user-menu': UserMenu,
            'eicon-menu': EiconMenu,
        }
    })
    export default class ContextMenu extends Vue {
        @Prop({required: true})
        readonly reportDialog!: ReportDialog;
        l = l;
        showContextMenu = false;

        setContextMenuShown(newValue: boolean) {
            log.silly(`ContextMenu.setContextMenuShown.${newValue}`);

            this.showContextMenu = newValue;
        }

        hideContextMenu() {
            this.showContextMenu = false;
            (this.$refs['userMenu']  as UserMenu ).showContextMenu = false;
            (this.$refs['eiconMenu'] as EiconMenu).showContextMenu = false;
        }

        touchedElement: HTMLElement | undefined;

        /**
         * The actual handler of right click events.
         */
        handleEvent(e: MouseEvent | TouchEvent): void {
            const touch = e.type === 'touchstart' ? (<TouchEvent>e).changedTouches[0] : <MouseEvent>e;
            let node = <HTMLElement & {character?: Character, channel?: Channel, touched?: boolean, eicon?: string}>touch.target;
            while(node !== document.body) { // Run up the entire DOM
                if(e.type !== 'click' && node === this.$refs['menu'] || node.id === 'userMenuStatus') return;

                if (node.character || node.dataset['character'] || node.eicon || node.dataset['eicon'] || node.parentNode === null) {
                    break;
                }

                node = node.parentElement!;
            }
            if(node.dataset['touch'] === 'false' && e.type !== 'contextmenu') return;

            if (node.character || node.eicon) {
                log.debug('UserMenu.handleEvent.has', {
                    character: node.character,
                    channel: node.channel,
                    eicon: node.eicon,
                });
            }
            else {
                if(node.dataset['character']) {
                    node.character = core.characters.get(node.dataset['character']!);
                }
                else if (node.dataset['eicon']) {
                    // Weird that we got here, we don't use this anywhere.
                    log.info(`UserMenu.handleEvent.datasetEicon.${node.dataset['eicon']}`);

                    node.eicon = node.dataset['eicon'];
                }
                else {
                    this.hideContextMenu();
                    this.touchedElement = undefined;
                    return;
                }
            }

            switch(e.type) {
                case 'click': // Standard left click; also touch release?
                    // To what end is the dataset [legacy] checked?
                    if (node.dataset['character'] === undefined && node.character)
                        if (node === this.touchedElement) { // Is this touch release?
                            this.showContextMenu = true;

                            (this.$refs['userMenu'] as UserMenu).openMenu(touch, node.character, node.channel || undefined);
                        }
                        else {
                            (this.$refs['userMenu'] as UserMenu).onClick(node.character);
                        }
                    e.preventDefault();
                    break;
                case 'touchstart': // Finger touched screen
                    this.touchedElement = node;
                    break;
                case 'contextmenu': // Standard right click
                    if (node.character) {
                        this.showContextMenu = true;

                        (this.$refs['userMenu'] as UserMenu).openMenu(touch, node.character, node.channel || undefined);
                    }
                    else if (node.eicon) {
                        this.showContextMenu = true;

                        (this.$refs['eiconMenu'] as EiconMenu).openMenu(touch, node.eicon);
                    }

                    e.preventDefault();
            }
        }
    }
</script>

<style lang="scss">
.contextMenu {
    position: fixed;
    display: block;
    padding: 10px 10px 5px;
    width: 220px;
    z-index: 1100;
}
.contextMenu .list-group-item {
    padding: 3px;
}

.contextMenu .list-group-item-action {
    border-top-width: 0;
    z-index: -1;
}

.usermenu-backdrop.modal-backdrop.show {
    opacity: 0;
    z-index: 1099;
}
</style>
