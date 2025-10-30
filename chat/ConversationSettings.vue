<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <home-page ref="homePageLayout">
        <template v-slot:prescroll>
            <h5>{{ l('conversationSettings.action', conversation.name) }}</h5>
        </template>

        <template v-slot:default>
            <dropdown :obj="settings" prefix="conversationSettings" setting="notify">
                <option :value="setting.Default">{{ l('settings.useGlobalSetting')  }}</option>
                <option :value="setting.True"   >{{ l('conversationSettings.true')  }}</option>
                <option :value="setting.False"  >{{ l('conversationSettings.false') }}</option>
            </dropdown>

            <dropdown v-show="isChannel" :obj="settings" prefix="conversationSettings" setting="notifyOnFriendMessage">
                <option :value="friendchooser.Default"  >{{ l('settings.useGlobalSetting')             }}</option>
                <option :value="friendchooser.Friends"  >{{ l('settings.relation.friendsOnly')         }}</option>
                <option :value="friendchooser.Bookmarks">{{ l('settings.relation.bookmarksOnly')       }}</option>
                <option :value="friendchooser.Both"     >{{ l('settings.relation.friendsAndBookmarks') }}</option>
                <option :value="friendchooser.NoOne"    >{{ l('settings.relation.noOne')               }}</option>
            </dropdown>

            <div class="form-group"><hr></div>

            <dropdown v-show="isChannel" :obj="settings" prefix="conversationSettings" setting="highlight">
                <option :value="setting.Default">{{ l('settings.useGlobalSetting')  }}</option>
                <option :value="setting.True"   >{{ l('conversationSettings.true')  }}</option>
                <option :value="setting.False"  >{{ l('conversationSettings.false') }}</option>
            </dropdown>

            <checkbox :obj="settings" prefix="conversationSettings" setting="defaultHighlights"></checkbox>

            <textfield :obj="settings" prefix="conversationSettings" setting="highlightWords"
                :validator="vdHighlightString" :transformer="tfHighlightString"></textfield>

            <textfield v-show="isChannel" :obj="settings" prefix="conversationSettings" setting="highlightUsernames"
                :validator="vdHighlightString" :transformer="tfHighlightString"></textfield>

            <div class="form-group"><hr></div>

            <dropdown :obj="settings" prefix="conversationSettings" setting="joinMessages">
                <option :value="setting.Default">{{ l('settings.useGlobalSetting')  }}</option>
                <option :value="setting.True"   >{{ l('conversationSettings.true')  }}</option>
                <option :value="setting.False"  >{{ l('conversationSettings.false') }}</option>
            </dropdown>
        </template>
    </home-page>
</template>
<script lang="ts">
    import Vue from 'vue';
    import { Component, Prop, Hook } from '@f-list/vue-ts';

    import HomePageLayout from './home_pages/HomePageLayout.vue';

    import GenericDropdown from './home_pages/settings/GenericDropdown.vue';
    import GenericCheckbox from './home_pages/settings/GenericCheckbox.vue';
    import GenericText     from './home_pages/settings/GenericText.vue';

    import l from './localize';





    import { Conversation, Relation } from './interfaces';

    @Component({
        components: {
            'home-page': HomePageLayout,
            'dropdown':  GenericDropdown,
            'checkbox':  GenericCheckbox,
            'textfield': GenericText,
        }
    })
    export default class ConversationSettings extends Vue {
        l = l;
        setting       = Conversation.Setting;
        friendchooser = Relation.Chooser;

        @Prop({required: true})
        readonly conversation!: Conversation;

        settings!: Conversation.Settings

        get isChannel() { return Conversation.isChannel(this.conversation) }


        @Hook('created')
        created() {
            this.settings = this.conversation.settings;
        }

        vdHighlightString(s: string): boolean {
            if (this.tfHighlightString(s))
                return true;
            else
                return false;
        }

        tfHighlightString(s: string): string[] {
            const a = s.trim().toLowerCase()
                .split(/\s*,\s*/)
                .filter(v => v);
            return [ ...new Set(a) ];
        }
    }
</script>
