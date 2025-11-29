<template>
  <modal :action="l('eicon.select')" ref="dialog" :buttons="false" @close="close" dialogClass="eicon-selector big">
    <div class="eicon-selector-ui">
      <div v-if="refreshing" class="d-flex align-items-center loading">
        <strong>{{ l('eicon.loading') }}</strong>
        <div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>
      </div>
      <div v-else>
        <div class="search-bar">
        <input type="text" class="form-control search" id="search" v-model="search" ref="search" :placeholder="l('eicon.search')" @input="searchUpdateDebounce()" tabindex="0" @click.prevent.stop="setFocus()" @mousedown.prevent.stop @mouseup.prevent.stop />
        <div class="btn-group search-buttons">
            <div class="btn expressions" @click.prevent.stop="searchWithString('category:favorites')" :title="l('eicon.favorites')" role="button" tabindex="0">
            <i class="fas fa-thumbtack"></i>
            </div>

            <div class="btn expressions" @click.prevent.stop="searchWithString('category:expressions')" :title="l('eicon.expressions')" role="button" tabindex="0">
            <i class="fas fa-theater-masks"></i>
            </div>

            <div class="btn soft" @click.prevent.stop="searchWithString('category:soft')" :title="l('eicon.soft')" role="button" tabindex="0">
            <i class="fas fa-spa"></i>
            </div>

            <div class="btn sexual" @click.prevent.stop="searchWithString('category:sexual')" :title="l('eicon.sexual')" role="button" tabindex="0">
            <i class="fas fa-heart"></i>
            </div>

            <div class="btn bubbles" @click.prevent.stop="searchWithString('category:bubbles')" :title="l('eicon.speech')" role="button" tabindex="0">
            <i class="fas fa-comment"></i>
            </div>

            <div class="btn actions" @click.prevent.stop="searchWithString('category:symbols')" :title="l('eicon.symbols')" role="button" tabindex="0">
            <i class="fas fa-icons"></i>
            </div>

            <div class="btn memes" @click.prevent.stop="searchWithString('category:memes')" :title="l('eicon.memes')" role="button" tabindex="0">
            <i class="fas fa-poo"></i>
            </div>

            <div class="btn random" @click.prevent.stop="searchWithString('category:random')" :title="l('eicon.random')" role="button" tabindex="0">
            <i class="fas fa-random"></i>
            </div>

            <div class="btn refresh" @click.prevent.stop="refreshIcons" :title="l('eicon.refresh')" role="button" tabindex="0">
            <i class="fas fa-sync"></i>
            </div>
        </div>
        </div>

        <!-- Footer -->
        <div class="courtesy">
          {{ l('eicon.thanks') }}<a href="https://xariah.net/eicons">xariah.net</a>
        </div>

        <div class="upload">
          <a href="https://www.f-list.net/icons.php">{{ l('eicon.upload') }}</a>
        </div>
        <!-- /Footer -->

        <div class="carousel slide w-100 results">
          <div class="carousel-inner w-100" role="listbox">
            <div class="carousel-item" v-for="eicon in results" :key="eicon" role="img" :aria-label="eicon" tabindex="0">
              <img class="eicon" v-if="results.includes(eicon)" :alt="eicon" :src="'https://static.f-list.net/images/eicon/' + eicon + '.gif'" :title="eicon" role="button" :aria-label="eicon" @click.prevent.stop="selectIcon(eicon, $event)">

              <div class="btn favorite-toggle" v-if="results.includes(eicon)" :class="{ favorited: isFavorite(eicon) }" @click.prevent.stop="toggleFavorite(eicon)" role="button" :aria-label="isFavorite(eicon) ? l('eicon.favRemove') : l('eicon.favAdd')">
                <i class="fas fa-thumbtack"></i>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </modal>
</template>

<script lang="ts">
import l from '../chat/localize';
import { Component, Hook, Prop } from '@f-list/vue-ts';
import { EIconStore } from '../learn/eicon/store';
import core from '../chat/core';
import modal from '../components/Modal.vue';
import CustomDialog from '../components/custom_dialog';
import { debounce } from '../helpers/utils';

let store: EIconStore | undefined;

@Component({ components: { modal } })
export default class EIconSelector extends CustomDialog {
    @Prop
    readonly onSelect?: (eicon: string, shift: boolean) => void;

    l = l;

    results: string[] = [];
    search: string = '';
    refreshing: boolean = true;

    searchUpdateDebounce = debounce(() => this.runSearch(), { wait: 350 });

    @Hook('mounted')
    async mounted(): Promise<void> {
        store = await EIconStore.getSharedStore();
        this.refreshing = false;

        this.searchWithString('category:favorites');
    }

    searchWithString(s: string) {
        this.search = s;
        this.runSearch();
    }

    runSearch() {
        const s = this.search.toLowerCase();

        if (s.startsWith('category:')) {
            const category = s.substring(9).trim();

            if (category === 'random')
                this.results = store?.nextPage() || [];
            else
                this.results = this.getCategoryResults(category);
        }
        else if (s.length === 0)
            this.results = store?.nextPage() || [];
        else
            this.results = store?.search(s).slice(0, 301) || [];
    }

    getCategoryResults(category: string): string[] {
        switch(category) {
        case 'expressions':
            return [
                            // Memetic
                'shhh', 'excuse me',
                            // Anime:
                'no tax refund', 'kizunaai', 'robotsmug', 'angyraihan', 'heartseyes', 'confused01', 'moronyeh', 'ashemote3', 'howembarrassing', 'hyperahegao', 'luminosebleed', 'baisergushing', 'aijam',
                            // Cartoon-ish:
                'nuttoohard', 'bangfingerbang', 'simpwaifu', 'paishake', 'lip',
                            // Cartoon:
                'fluttersorry', 'thirstytwi', 'horseeyes', 'horsepls',
                            // Emoji adjacent:
                'catblob',  'catblobangery', 'blobhugs', 'geblobcatshrug', 'badkitty', 'eggplantemoji', 'peachemoji', 'splashemoji', 'eyes emoji',
                            // Emoji:
                'flushedemoji', 'pensiveemoji', 'heart eyes', 'kissing heart', 'melting emoji', 'thinkingemoji', 'party emoji', 'triumphemoji', 'uwuemoji', 'bottomfingers', 'heartflooshed', 'blushpanic', 'love2', 'whentheohitsright', 'embarassment', 'twittersob',
            ];

        case 'soft':
            return [
                            // Hi!:
                'dogdoin', 'doggohi', 'smile5', 'fluffbrain', 'coolraccoon', 'cat sit', 'kittypeeky',
                            // Fun:
                'kicky', 'yappers', 'nyehe', 'nyeheh', 'kittygiggle', 'samodance', 'dogewut', 'wibbl', 'dogcited', 'wagglebrow', 'fennec2', 'blobfoxbongo', 'akittyclap', 'nodnodnod', 'catbop', 'ermtime', 'bunnana', 'cateatingchips', 'catkiss',
                            // Soft:
                'imdieforever', 'waitingcuddles', 'waitingforforeheadkissie', 'blushcat', 'bunhug', 'meowhuggies', 'bunanxiety', 'cat_waddle',
                            // Chaos:
                'catnapping', 'catheadempty', 'bunnywavedash', 'bunnyscrem8', 'cry cat', 'yote gasp', 'cat2back', 'stupid little woo woo boy', 'chedoggo', 'scuffedhamster', 'angydoggo', 'kittyangy',
                            // Bye:
                'eepy', 'sleepdog', 'cat faceplant',
            ];

        case 'sexual':
            return [
                            // Act:
                'asutired1', 'asutired2', 'vanessamasturbate', 'musclefuck2', 'worshipping3', 'lapgrind', 'salivashare', 'slurpkiss', 'cockiss', 'lovetosuck', 'donglove', 'horseoral9a', 'swallowit', 'paiplop', 'satsukinailed', 'kntbch1', 'dickslurp',
                            // Showing Off:
                'influencerhater', 'sloppy01', 'fingersucc', 'cmontakeit', 'hopelessly in love', 'ahega01 2', 'absbulge', 'edgyoops', 'oralcreampie100px', 'debonairdick4', 'kirari1e', 'pinkundress', 'georgiethot',
                            // Body:
                'jhab1', 'coralbutt4', 'rorobutt2', 'ballsack3', 'blackshem1', 'cheegrope2', 'dropsqueeze', 'flaunt', 'haigure',
                            // BDSM:
                'gagged2', 'cumringgag',
                            // Symbols:
                'thekonlook', 'melodypeg', 'heart beat', 'lovebreeders', 'cummies', 'a condom', 'kissspink',
            ];

        case 'bubbles':
            return [
                            // Memetic:
                'speedl', 'speedr', 'notcashmoney', 'taftail', 'fuckyouasshole', 'ciaig', 'crimes', 'nagagross', 'rude1', 'helpicantstopsuckingcocks', 'eyesuphere', 'peggable2', 'sydeanothere', 'dickdick', 'frfister',
                            // Cutesy:
                'iacs', 'pat my head', 'pawslut', 'inbagg',
                            // Sexual:
                'lickme', 'takemetohornyjail', 'knotslutbubble', 'toofuckinghot', 'pbmr', 'imabimbo', 'fatdick', 'callmemommy', 'breakthesubs', 'fuckingnya', 'suckfuckobey', 'breedmaster', 'buttslutbb', 'simpbait', 'muskslut', '4lewdbubble', 'hypnosiss', 'imahypnoslut', 'notahealslut', '5lewdbubble', 'ratedmilf', 'ratedstud', 'ratedslut',  'xarcuminme', 'xarcumonme', 'fuckbun', 'fuckpiggy', 'plappening', 'goodboy0', 'spitinmouth',
            ];

        case 'symbols':
            return [
                            // Gender:
                'gender-cuntboy', 'gender-female', 'gender-herm', 'gender-male', 'gender-mherm', 'gender-none', 'gender-shemale', 'gender-transgender',
                            // Mosaics:
                'no ai', 'xpgameover1', 'xpgameover2', 'goldboomboxl', 'goldboomboxr',
                            // Pop culture:
                'getnorgetout', 'playstation', 'autobotsemblem', 'decepticonemblem',
                            // Cards
                'suitspades', 'suithearts', 'suitdiamonds',  'suitclubs',
                            // Letters and numbers:
                'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7', 'num-8', '9ball', 'agrade',
                            // Emoji adjacent:
                'pimpdcash', 'discovered', 'pls stop', 'question mark', 'questget', 'music', 'speaker emoji', 'cam',
                            // Misc:
                'goldendicegmgolddicegif', 'smashletter', 'pentagramo', 'cuffed', 'paw2', 'sunnyuhsuperlove', 'transflag', 'streamlive', 'computer', 'you got mail',
            ];

        case 'memes':
            return [
                'flowercatnopls', 'flowercatpls', 'bad eicon detected', 'admiss', 'perish', 'fsquint', 'kille', 'majimamelon', 'dogboom', 'catexplode',  'despairing', 'doorkick', 'doorkick2', 'emptyhand', 'sweat 1', 'tap the sign', 'soypoint', 'pethand', 'tailwaggy', 'tailsooo', 'e62pog', 'thehorse', 'guncock', 'nct1', 'michaelguns', 'squirtlegun', 'palpatine', 'thatskindahot', 'ygod', 'flirting101', 'loudnoises', 'nyancat', 'gayb', 'apologize to god', 'jabbalick', 'raisefinger', 'whatislove', 'surprisemothafucka', 'thanksihateit', 'hell is this', 'confused travolta', 'no words', 'coffindance', 'homelander', 'thatsapenis', 'kermitbusiness', 'imdyingsquirtle', 'goodbye', 'oag',
            ];

        case 'favorites':
            return Object.keys(core.state.favoriteEIcons);
        }

        return [];
    }

    selectIcon(eicon: string, event: MouseEvent): void {
        const shift = event.shiftKey;

        if (this.onSelect) {
            this.onSelect(eicon, shift);
        }
    }

    async refreshIcons(payload: MouseEvent): Promise<void> {
        this.refreshing = true;

        await store?.checkForUpdates(payload.shiftKey);
        this.runSearch();

        this.refreshing = false;
    }

    setFocus(): void {
        (this.$refs['search'] as HTMLInputElement).focus();
        (this.$refs['search'] as HTMLInputElement).select();
    }

    isFavorite(eicon: string): boolean {
        return eicon in core.state.favoriteEIcons;
    }

    toggleFavorite(eicon: string): void {
        if (eicon in core.state.favoriteEIcons)
            delete core.state.favoriteEIcons[eicon];
        else
            core.state.favoriteEIcons[eicon] = true;

        void core.settingsStore.set('favoriteEIcons', core.state.favoriteEIcons);

        this.$forceUpdate();
    }

    close(): void {
        store?.shuffle();
    }
}
</script>

<style lang="scss">
.modal-body:has(> .eicon-selector-ui) {
    /* Has to override on-element styling in modal. */
    overflow-x: hidden !important;
}

.eicon-selector.big {
    line-height: 1;
    z-index: 1000;

    min-height: 356px; /* Seemingly arbitrary */
    width: 590px;
    max-width: 590px;
}

.eicon-selector-ui {
    min-width: 555px;

    .search-bar {
        display: flex;

        .search {
            flex: 1;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
        }

        .search-buttons {
            margin-left: -1px;

            .btn {
                border-bottom: 1px solid var(--secondary);

                .fas {
                    text-align: center;
                    vertical-align: inherit;
                    width: 1em;
                }
            }

            .expressions {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
        }
    }

    .upload {
        left: 1rem;

        position: absolute;
        bottom: 7px;
        font-size: 9px;
        opacity: 50%;
    }

    .courtesy {
        right: 1rem;

        position: absolute;
        bottom: 7px;
        font-size: 9px;
        opacity: 50%;
    }
}

.carousel.results {
    margin-top: 5px;
    margin-bottom: 0.5rem;

    max-height: unset;
    /* Each icon is 75x75px, wiuth a 1px border.
        However, the border shrinks for some reason,
        so the actual icon div height is 76.56.
        Total height: 76.56 * 7 = 535.92px */
    height: 537px;

    .carousel-inner {
        overflow-x: hidden;
        overflow-y: scroll;
        height: 100%;
    }

    .carousel-item {
        display: inline-block;
        width: initial;
        margin-right: initial;
        border: solid 1px transparent !important;
        position: relative;

        .favorite-toggle {
            position: absolute;
            right: 0;
            top: 0;
            border: none;
            margin: 0;
            padding: 4px;
            border-radius: 0;
            visibility: hidden;

            i {
                color: var(--gray-dark);
                -webkit-text-stroke-width: medium;
                -webkit-text-stroke-color: var(--light);
            }

            &.favorited {
                i {
                    color: var(--green);
                }

                &:hover {
                i {
                    -webkit-text-stroke-color: var(--gray-dark);
                }
            }
            }

            &:hover {
                background: linear-gradient(to bottom left, var(--light), transparent 60%);

                i {
                    -webkit-text-stroke-color: var(--green);
                }
            }
        }

        img.eicon {
            width: 75px;
            height: 75px;
            max-width: 75px;
            max-height: 75px;
        }

        &:hover {
            background-color: var(--secondary) !important;
            border: solid 1px var(--gray-dark) !important;

            .favorite-toggle {
                visibility: visible !important;
            }
        }
    }
}
</style>
