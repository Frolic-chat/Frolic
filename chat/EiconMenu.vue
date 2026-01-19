<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <div>
        <div id="eiconMenu" class="contextMenu list-group" v-show="showContextMenu" :style="position" ref="menu">
            <div v-for="character in myCharacters" style="min-height: 65px;padding:5px;overflow:auto" class="list-group-item" @click.stop>
                <img :src="getAvatarFor(character.name)" style="width:60px;height:60px;" v-if="showAvatars"/>
                <span style="margin:0;">{{ character.name }}</span>
            </div>
            <a tabindex="-1" href="#" @click.prevent="" class="list-group-item list-group-item-action">
                <span class="far fa-fw fa-sticky-note"></span>
                {{ 'Some Text' }}
            </a>
        </div>
        <div class="modal-backdrop show usermenu-backdrop" v-show="showContextMenu" v-if="eicon"></div>
    </div>
</template>

<script lang="ts">
import { Component, Watch } from '@f-list/vue-ts';
import Vue from 'vue';
import { BBCodeView } from '../bbcode/view';
import core from './core';
// import l from './localize';

import type { Character } from './interfaces';

import NewLogger from '../helpers/log';
const log = NewLogger('user-menu');

/**
 * The eicon menu should only ever be included and invoked from the primary menu. While the eicon options could be built into the primary usermenu, we feel it's important
 */
@Component({
    components: {
        bbcode: BBCodeView(core.bbCodeParser),
    }
})
export default class EiconMenu extends Vue {
    /**
     * Display
     */

    myCharacters: Character[] = [];

    get showAvatars(): boolean {
        return core.state.settings.showAvatars;
    }

    getAvatarFor = (name: string) => core.characters.getImage(name);

    /**
     * onClick handler for menu entry (character name/icon).
     * @param name Character you clicked on
     */
    onMenuEntryClick(name: string) {
        log.silly(`EiconMenu.onCharacterClick.${name}`);

        // Add eicon to that person's favorites
    }

    /**
     * click data
     */
    showContextMenu = false;

    @Watch('showContextMenu')
    onContextMenuChanged(newValue: boolean) {
        log.silly(`EiconMenu.onContextMenuChanged.${newValue}`);

        this.$emit('toggleMenu', newValue);
    }


    position = {left: '', top: ''};
    eicon?: string;

        /**
         * Handler for character right-clicks.
         * @param touch Used for positioning menu
         * @param eicon Eicon name
         * @param showContextMenu set internal `showContextMenu` variable to true to
         */
    async openMenu(touch: MouseEvent | Touch, eicon: string, showContextMenu: boolean = true) {
        this.showContextMenu = showContextMenu;

        this.eicon = eicon;
        this.position = {left: `${touch.clientX}px`, top: `${touch.clientY}px`};

        log.silly('EiconMenu.openMenu.position', this.position);

        // At this point, we should get the charater list and thus, avatars.
        // this.characterImage = core.characters.getImage(character.name);

        this.$nextTick(() => {
            const menu = this.$refs['menu'] as HTMLElement;

            // Don't allow to run offscreen
            if ((parseInt(this.position.left, 10) + menu.offsetWidth) > window.innerWidth) {
                this.position.left = `${window.innerWidth - menu.offsetWidth - 1}px`;
            }

            if ((parseInt(this.position.top, 10) + menu.offsetHeight) > window.innerHeight) {
                this.position.top = `${window.innerHeight - menu.offsetHeight - 1}px`;
            }
        });
    }
}
</script>
