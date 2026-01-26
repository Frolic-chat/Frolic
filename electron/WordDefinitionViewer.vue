<template>
    <modal :buttons="false" ref="wordDefinitionViewer" dialogClass="word-definition-viewer">
        <template slot="title">
            {{ wordDefinitionLookup }}

            <a class="btn wordDefBtn dictionary" @click="openDefinitionWithDictionary"><i>D</i></a>
            <a class="btn wordDefBtn thesaurus" @click="openDefinitionWithThesaurus"><i>T</i></a>
            <a class="btn wordDefBtn urbandictionary" @click="openDefinitionWithUrbanDictionary"><i>UD</i></a>
            <a class="btn wordDefBtn wikipedia" @click="openDefinitionWithWikipedia"><i>W</i></a>

            <a class="btn" @click="openWordDefinitionInBrowser"><i class="fa fa-external-link-alt"></i></a>
        </template>
        <word-definition :expression="wordDefinitionLookup" ref="wordDefinitionLookup"></word-definition>
    </modal>
</template>

<script lang="ts">
    import { Component, Hook } from '@frolic/vue-ts';
    import Vue from 'vue';

    import Modal from '../components/Modal.vue';

    import * as Electron from 'electron';
    import WordDefinition from '../learn/dictionary/WordDefinition.vue';
    import EventBus from '../chat/preview/event-bus';

    import NewLogger from '../helpers/log';
    const log = NewLogger('dictionary');

    @Component({
        components: {
            modal: Modal,
            'word-definition': WordDefinition,
        }
    })
    export default class WordDefinitionViewer extends Vue {
        wordDefinitionLookup = '';

        @Hook('mounted')
        onMounted(): void {
            log.debug('wordDefinitionViewer.mounted');

            EventBus.$on('word-definition', event => {
                this.wordDefinitionLookup = event.lookupWord;

                if (event.lookupWord)
                    (<Modal>this.$refs.wordDefinitionViewer).show();
            });
        }

        async openDefinitionWithDictionary(): Promise<void> {
            (this.$refs.wordDefinitionLookup as any).setMode('dictionary');
        }


        async openDefinitionWithThesaurus(): Promise<void> {
            (this.$refs.wordDefinitionLookup as WordDefinition).setMode('thesaurus');
        }


        async openDefinitionWithUrbanDictionary(): Promise<void> {
            (this.$refs.wordDefinitionLookup as WordDefinition).setMode('urbandictionary');
        }


        async openDefinitionWithWikipedia(): Promise<void> {
            (this.$refs.wordDefinitionLookup as WordDefinition).setMode('wikipedia');
        }


        async openWordDefinitionInBrowser(): Promise<void> {
            Electron.ipcRenderer.send('open-url-externally', (this.$refs.wordDefinitionLookup as WordDefinition).getWebUrl());

            (this.$refs.wordDefinitionViewer as Modal).hide();
        }
    }
</script>

<style lang="scss">
@import "~bootstrap/scss/bootstrap";
    .btn.wordDefBtn {
        background-color: red;
        padding: 0.2rem 0.2rem;
        line-height: 90%;
        margin-right: 0.2rem;
        text-align: center;

        i {
            font-style: normal !important;
            color: white;
            font-weight: bold
        }

        &.thesaurus {
            background-color: #F44725
        }

        &.urbandictionary {
            background-color: #d96a36;

            i {
                color: #fadf4b;
                text-transform: lowercase;
                font-family: monospace;
            }
        }

        &.dictionary {
            background-color: #314ca7;
        }

        &.wikipedia {
            background-color: white;

            i {
                color: black;
                font-family: serif;
            }
        }
    }

    .modal {
        .word-definition-viewer {
            max-width: 50rem !important;
            width: 70% !important;
            min-width: 22rem !important;

            .modal-content {
                min-height: 75%;
            }

            .definition-wrapper {
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                margin-left: 20px;
                margin-right: 20px;

                webview {
                    height: 100%;
                    padding-bottom: 10px;
                }
            }
        }
    }
</style>
