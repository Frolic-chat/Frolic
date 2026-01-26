<template>
    <div class="guestbook">
        <div v-show="loading" class="alert alert-info">Loading guestbook.</div>

        <label v-show="canEdit" class="control-label">Unapproved only:
            <input type="checkbox" v-model="unapprovedOnly"/>
        </label>

        <template v-if="!loading">
            <div class="guestbook-controls">
                <simple-pager :next="hasNextPage" :prev="page > 1" @next="++page" @prev="--page"></simple-pager>
            </div>

            <div class="alert alert-info" v-show="posts.length === 0">No guestbook posts.</div>

            <guestbook-post :character="character" :post="post" :can-edit="canEdit" v-for="post in posts" :key="post.id"
                @reload="getPage"></guestbook-post>

            <div v-if="authenticated && !oldApi" class="form-horizontal">
                <bbcode-editor v-model="newPost.message" :maxlength="5000" classes="form-control"></bbcode-editor>
                <input type="checkbox" id="guestbookPostPrivate" v-model="newPost.privatePost"/>
                <label class="control-label" for="guestbookPostPrivate">Private(only visible to owner)</label><br/>
                <label class="control-label" for="guestbook-post-character">Character: </label>
                <character-select id="guestbook-post-character" v-model="newPost.character"></character-select>
                <button @click="makePost" class="btn btn-success" :disabled="newPost.posting">Post</button>
            </div>

            <div class="guestbook-controls">
                <simple-pager :next="hasNextPage" :prev="page > 1" @next="++page" @prev="--page"></simple-pager>
            </div>
        </template>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Watch} from '@frolic/vue-ts';
    import Vue from 'vue';
    import * as Utils from '../utils';
    import {methods, Store} from './data_store';
    import {Character, GuestbookPost, Guestbook} from './interfaces';

    import GuestbookPostView from './guestbook_post.vue';
    import core from '../../chat/core';

    import NewLogger from '../../helpers/log';
    const log = NewLogger('character-sheet');

    @Component({
        components: {'guestbook-post': GuestbookPostView}
    })
    export default class GuestbookView extends Vue {
        @Prop({required: true})
        readonly character!: Character;

        @Prop({ default: false })
        readonly parentIsReloading: boolean = false;

        @Prop
        readonly oldApi?: true;

        loading = false;
        waitingOnParent = false;
        lastLoad = 0;
        RELOAD_THROTTLE = 10000;

        error = '';
        authenticated = Store.authenticated;
        posts: GuestbookPost[] = [];
        unapprovedOnly = false;
        page = 1;
        hasNextPage = false;
        canEdit = false;
        newPost = {
            posting: false,
            privatePost: false,
            character: Utils.settings.defaultCharacter,
            message: ''
        };

        @Watch('unapprovedOnly')
        @Watch('page')
        async getPage(): Promise<void> {
            log.debug('guestbook.getPage.start', {
                loading: this.loading,
                page:    this.page,
            });

            try {
                this.loading = true;
                const guestbookState = await this.resolvePage();
                this.lastLoad = Date.now();
                this.posts = guestbookState.posts;
                this.hasNextPage =  (this.page + 1) * 10 < guestbookState.total;
            } catch(e) {
                log.debug('guestbook.getPage.error', {
                    error:   e,
                    loading: this.loading,
                });

                this.posts = [];
                this.hasNextPage = false;
                this.canEdit = false;
                if(Utils.isJSONError(e))
                    this.error = <string>e.response.data.error;
                Utils.ajaxError(e, 'Unable to load guestbook posts.');
            } finally {
                log.debug('guestbook.getPage.finally', { loading: this.loading });

                this.loading = false;
            }
        }

        async makePost(): Promise<void> {
            try {
                this.newPost.posting = true;
                await methods.guestbookPostPost(this.character.character.id, this.newPost.character, this.newPost.message,
                    this.newPost.privatePost);
                this.page = 1;
                await this.getPage();
            } catch(e) {
                Utils.ajaxError(e, 'Unable to post new guestbook post.');
            } finally {
                this.newPost.posting = false;
            }
        }

        async resolvePage(): Promise<Guestbook> {
            log.debug('guestbook.resolvePage.start', this.page, this.loading,);

            if (this.page === 1) {
                const c = await core.cache.profileCache.get(this.character.character.name);

                if (c?.meta?.guestbook)
                    return c.meta.guestbook;
            }

            log.debug('guestbook.resolvePage.fallback', {
                character: this.character.character.name,
                page:      this.page,
                approved:  this.unapprovedOnly,
                loading:   this.loading,
            });
            return methods.guestbookPageGet(this.character.character.id, (this.page - 1) * 10, 10, this.unapprovedOnly);
        }

        async show(): Promise<void> {
            if (this.parentIsReloading) {
                log.debug('guestbook.show.parentIsReloading');
                this.waitingOnParent = true;
                setTimeout(() => this.show(), 200);
            }
            else if (this.waitingOnParent /* inherent: !parentIsReloading */
                  || !this.loading && (Date.now() - this.lastLoad) > this.RELOAD_THROTTLE) { // don't spam!!!
                log.debug('guestbook.show.refreshing');
                await this.getPage();
            }
            else {
                log.debug('guestbook.show.skipping', {
                    parent:  this.parentIsReloading,
                    loading: this.loading,
                    elapsed: (Date.now() - this.lastLoad),
                });
            }
        }
    }
</script>
