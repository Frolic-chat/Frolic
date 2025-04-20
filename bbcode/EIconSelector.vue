<template>
  <modal :action="l('eicon.select')" ref="dialog" :buttons="false" dialogClass="eicon-selector big">
    <div class="eicon-selector-ui">
      <div v-if="!store || refreshing" class="d-flex align-items-center loading">
        <strong>{{ l('eicon.loading') }}</strong>
        <div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>
      </div>
      <div v-else>
        <div>
          <div class="search-bar">
            <input type="text" class="form-control search" id="search" v-model="search" ref="search" :placeholder="l('eicon.search')" tabindex="0" @click.prevent.stop="setFocus()" @mousedown.prevent.stop @mouseup.prevent.stop />
            <div class="btn-group search-buttons">
              <div class="btn expressions" @click.prevent.stop="runSearch('category:favorites')" :title="l('eicon.favorites')" role="button" tabindex="0">
                <i class="fas fa-thumbtack"></i>
              </div>

              <div class="btn expressions" @click.prevent.stop="runSearch('category:expressions')" :title="l('eicon.expressions')" role="button" tabindex="0">
                <i class="fas fa-theater-masks"></i>
              </div>

              <div class="btn soft" @click.prevent.stop="runSearch('category:soft')" :title="l('eicon.soft')" role="button" tabindex="0">
                <i class="fas fa-spa"></i>
              </div>

              <div class="btn sexual" @click.prevent.stop="runSearch('category:sexual')" :title="l('eicon.sexual')" role="button" tabindex="0">
                <i class="fas fa-heart"></i>
              </div>

              <div class="btn bubbles" @click.prevent.stop="runSearch('category:bubbles')" :title="l('eicon.speech')" role="button" tabindex="0">
                <i class="fas fa-comment"></i>
              </div>

              <div class="btn actions" @click.prevent.stop="runSearch('category:symbols')" :title="l('eicon.symbols')" role="button" tabindex="0">
                <i class="fas fa-icons"></i>
              </div>

              <div class="btn memes" @click.prevent.stop="runSearch('category:memes')" :title="l('eicon.memes')" role="button" tabindex="0">
                <i class="fas fa-poo"></i>
              </div>

              <div class="btn random" @click.prevent.stop="runSearch('category:random')" :title="l('eicon.random')" role="button" tabindex="0">
                <i class="fas fa-random"></i>
              </div>

              <div class="btn refresh" @click.prevent.stop="refreshIcons()" :title="l('eicon.refresh')" role="button" tabindex="0">
                <i class="fas fa-sync"></i>
              </div>
            </div>
          </div>

          <div class="courtesy">
            {{ l('eicon.thanks') }}<a href="https://xariah.net/eicons">xariah.net</a>
          </div>

          <div class="upload">
            <a href="https://www.f-list.net/icons.php">{{ l('eicon.upload') }}</a>
          </div>
        </div>

        <div class="carousel slide w-100 results">
          <div class="carousel-inner w-100" role="listbox">
            <div class="carousel-item" v-for="eicon in results" role="img" :aria-label="eicon" tabindex="0">
              <img class="eicon" :alt="eicon" :src="'https://static.f-list.net/images/eicon/' + eicon + '.gif'" :title="eicon" role="button" :aria-label="eicon" @click.prevent.stop="selectIcon(eicon, $event)">

              <div class="btn favorite-toggle" :class="{ favorited: isFavorite(eicon) }" @click.prevent.stop="toggleFavorite(eicon)" role="button" :aria-label="isFavorite(eicon) ? l('eicon.favRemove') : l('eicon.favAdd')">
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
import _ from 'lodash';
import l from '../chat/localize';
import { Component, Hook, Prop, Watch } from '@f-list/vue-ts';
// import Vue from 'vue';
import log from 'electron-log'; //tslint:disable-line:match-default-export-name
import { EIconStore } from '../learn/eicon/store';
import core from '../chat/core';
import modal from '../components/Modal.vue';
import CustomDialog from '../components/custom_dialog';

@Component({
  components: { modal }
})
export default class EIconSelector extends CustomDialog {
  @Prop
  readonly onSelect?: (eicon: string, shift: boolean) => void;

  store: EIconStore | undefined;
  results: string[] = [];

  search: string = '';

  l = l;

  refreshing = false;

  searchUpdateDebounce = _.debounce(() => this.runSearch(), 350, { maxWait: 2000 });

  @Hook('mounted')
  async mounted(): Promise<void> {
    try {
      this.store = await EIconStore.getSharedStore();
      this.runSearch('');
    } catch (err) {
      // don't break the client in case service is down
      log.error('eiconSelector.load.error', { err })
    }
  }

  @Watch('search')
  searchUpdate() {
    this.searchUpdateDebounce();
  }

  runSearch(search?: string) {
    if (search) {
      this.search = search;
    }

    const s = this.search.toLowerCase().trim();

    if (s.substring(0, 9) === 'category:') {
      const category = s.substring(9).trim();

      if (category === 'random') {
        this.results = _.map(this.store?.random(250), (e) => e.eicon);
      } else {
        this.results = this.getCategoryResults(category);
      }
    } else {
      if (s.length === 0) {
        this.results = _.map(this.store?.random(250), (e) => e.eicon);
      } else {
        this.results = _.map(_.take(this.store?.search(s), 250), (e) => e.eicon);
      }
    }
  }

  getCategoryResults(category: string): string[] {
      switch(category) {
          case 'expressions':
              return [
                              // Furry
                  'cateatingchips', 'bunnyscrem8', 'kittyangy', 'fennec2', 'angydoggo', 'yote gasp', 'shhh', 'excuse me', 'cat2back',
                              // Anime:
                  'no tax refund', 'yappers', 'kizunaai', 'robotsmug', 'angyraihan', 'heartseyes', 'confused01', 'moronyeh', 'ashemote3', 'howembarrassing', 'hyperahegao', 'luminosebleed', 'baisergushing', 'aijam',
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
                  'dogdoin', 'doggohi', 'smile5', 'fluffbrain', 'cat sit', 'kittypeeky', 'doggosneekpeek',
                              // Fun:
                  'kicky', 'nyehe', 'nyeheh', 'kittygiggle', 'samodance', 'dogewut', 'wibbl', 'dogcited', 'wagglebrow', 'blobfoxbongo', 'akittyclap', 'nodnodnod', 'catbop', 'ermtime', 'bunnana', 'catkiss',
                              // Soft:
                  'waitingcuddles', 'waitingforforeheadkissie', 'blushcat', 'bunhug', 'meowhuggies', 'bunanxiety', 'cat_waddle',
                              // Chaos:
                  'catnapping', 'catheadempty', 'bunnywavedash', 'cry cat', 'wolfnomf', 'stupid little woo woo boy', 'scuffedcat', 'scuffedhamster', 'nyooo',
                              // Bye:
                  'life', 'eepy', 'sleepdog', 'cat faceplant',
              ]

          case 'sexual':
              return [
                              // Act:
                  'asutired1', 'asutired2', 'subj3', 'subj4', 'vanessamasturbate', 'musclefuck2', 'fingerblast3', 'worship', 'lapgrind', 'bbctitjob6', 'harmanfingers', 'salivashare', 'knotjob2', 'gaykiss', 'slurpkiss', 'cockiss', 'lovetosuck', 'handjob1nuke', 'cockloveeee', 'donglove', 'cummz',  'orccummies2',  'horseoral9a', 'swallowit', 'paiplop', 'satsukinailed', 'futaorgy', 'kntbch1', 'dickslurp',
                              // Showing Off:
                  'influencerhater', 'sloppy01', 'fingersucc', 'vullylick', 'cmontakeit', 'hopelessly in love', 'ahega01 2', 'g4ebulge', 'absbulge', 'lixlove', 'knotjiggle', 'edgyoops', 'oralcreampie100px', 'debonairdick4', 'hossspurties2', 'jillbimbogiffell2', 'gayicon2', 'kirari1e', 'capstrip','pinkundress', 'georgiethot',
                              // Body:
                  'wolf abs', 'jhab1', 'coralbutt4', 'rorobutt2', 'verobutt3', 'ballsack3', 'blackshem1', 'jessi flash', 'cheegrope2', 'patr1', '2buttw1', 'dropsqueeze', 'flaunt', 'haigure',
                              // BDSM:
                  'gagged2', 'cumringgag', 'brainmelt',
                              // Symbols:
                  'melodypeg', 'heart beat', 'lovebreeders', 'cummies', 'a condom', 'kissspink',
              ];

          case 'bubbles':
              return [
                              // Memetic:
                  'speedl', 'speedr', 'notcashmoney', 'taftail', 'fuckyouasshole', 'chorse', 'ciaig', 'dicefuck', 'shemale', 'crimes', 'nagagross', 'shimathatlewd', 'sheepsass2', 'iamgoingtopunchyou', 'rude1', 'helpicantstopsuckingcocks', 'eyesuphere', 'peggable2', 'sydeanothere', 'nothingcan', 'dinnersex', 'fallout-standby', 'request denied', 'dickletsign', 'frfister',
                              // Cutesy:
                  'iacs', 'bubblecute', 'pat my head', 'pawslut', 'inbagg',
                              // Sexual:
                  'lickme', 'emp', 'takemetohornyjail', 'knotslutbubble', 'toofuckinghot', 'pbmr', 'imabimbo', 'horseslut', 'fatdick', 'tomboypussy', 'breakthesubs', 'fuckingnya', 'iltclion', 'suckfuckobey', 'breedmaster', 'buttslutbb', 'onlyfans', 'muskslut', '4lewdbubble', 'hypnosiss', 'imahypnoslut', 'notahealslut', '5lewdbubble', 'ratedmilf', 'ratedstud', 'ratedslut',  'xarcuminme', 'xarcumonme', 'choke me', 'fuckbun',  'talkpooltoy', 'simpbait', 'fuckpiggy', 'plappening', 'goodboy0', 'spitinmouth',
              ];

          case 'symbols':
              return [
                              // Gender:
                  'gender-cuntboy', 'gender-female', 'gender-herm', 'gender-male', 'gender-mherm', 'gender-none', 'gender-shemale', 'gender-transgender',
                              // Mosaics:
                  'no ai', 'xpgameover1', 'xpgameover2', 'goldboomboxl', 'goldboomboxr',
                              // Pop culture:
                  'getnorgetout', 'playstation', 'ninetyfive', 'autobotsemblem', 'decepticonemblem',
                              // Cards
                  'suitspades', 'suithearts', 'suitdiamonds',  'suitclubs',
                              // Letters and numbers:
                  'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7', 'num-8', '9ball', 'agrade',
                              // Emoji adjacent:
                  'pimpdcash', 'carrots1', 'pinetree', 'sunshine', 'discovered', 'pls stop', 'question mark', 'questget', 'music', 'speaker emoji', 'milkcartonreal', 'cam',
                              // Misc:
                  'goldendicegmgolddicegif', 'smashletter', 'pentagramo', 'cuffed', 'paw2', 'sunnyuhsuperlove', 'transflag', 'streamlive', 'computer', 'you got mail', 'siren0', 'dont look away', 'hopeaspect',
              ];

          case 'memes':
              return [
                  'flowercatnopls', 'flowercatpls', 'bad eicon detected', 'admiss', 'perish', 'fsquint', 'kille', 'majimamelon', 'dogboom', 'catexplode',  'despairing', 'doorkick', 'doorkick2', 'emptyhand', 'sweat 1', 'tap the sign', 'soypoint', 'pethand', 'tailwaggy', 'tailsooo', 'e62pog', 'thehorse', 'guncock', 'nct1', 'michaelguns', 'squirtlegun', 'thatskindahot', 'ygod', 'flirting101', 'loudnoises', 'nyancat', 'gayb', 'apologize to god', 'jabbalick', 'raisefinger', 'whatislove', 'surprisemothafucka', 'thanksihateit', 'hell is this', 'confused travolta', 'no words', 'coffindance', 'homelander', 'thatsapenis', 'kermitbusiness', 'imdyingsquirtle', 'goodbye', 'oag',
              ];

          case 'favorites':
              return _.keys(core.state.favoriteEIcons);
      }

      return [];
  }

  selectIcon(eicon: string, event: MouseEvent): void {
    const shift = event.shiftKey;

    if (this.onSelect) {
      this.onSelect(eicon, shift);
    }
  }

  async refreshIcons(): Promise<void> {
    this.refreshing = true;

    await this.store?.update();
    await this.runSearch();

    this.refreshing = false;
  }

  setFocus(): void {
    (this.$refs['search']  as any).focus();
    (this.$refs['search']  as any).select();
  }

  isFavorite(eicon: string): boolean {
    return eicon in core.state.favoriteEIcons;
  }

  toggleFavorite(eicon: string): void {
    if (eicon in core.state.favoriteEIcons) {
      delete core.state.favoriteEIcons[eicon];
    } else {
      core.state.favoriteEIcons[eicon] = true;
    }

    void core.settingsStore.set('favoriteEIcons', core.state.favoriteEIcons);

    this.$forceUpdate();
  }
}
</script>

<style lang="scss">
  .eicon-selector {
      width: 580px;
      max-width: 580px;
      line-height: 1;
      z-index: 1000;

      &.big {
        min-height: 530px;
      }

    .eicon-selector-ui {
      .loading {

      }

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

          .refresh {

          }

        }
      }

      .courtesy {
        position: absolute;
        bottom: 7px;
        font-size: 9px;
        right: 1rem;
        opacity: 50%;
      }

      .upload {
        position: absolute;
        bottom: 7px;
        font-size: 9px;
        left: 1rem;
      }

      .results {
        max-height: 200px;
        overflow: hidden;
        margin-top: 5px;

        .carousel-inner {
          overflow-x: scroll;
          overflow-y: hidden;

          .carousel-item {
            display: table-cell;
            border: solid 1px transparent !important;
            position: relative;

            &:hover {
              background-color: var(--secondary) !important;
              border: solid 1px var(--gray-dark) !important;

              .favorite-toggle {
                visibility: visible !important;
              }
            }

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
                opacity: 0.85;
                -webkit-text-stroke-width: thin;
                -webkit-text-stroke-color: var(--light);

                &:hover {
                  opacity: 1;
                }
              }

              &.favorited {
                visibility: visible;

                i {
                  color: var(--green);
                  opacity: 1;

                  &:hover {
                    filter: brightness(1.1);
                  }
                }
              }
            }

            img.eicon {
              width: 75px;
              height: 75px;
              max-width: 75px;
              max-height: 75px;
            }
          }
        }
      }
    }

    &.big {
      min-height: 530px;
      width: 590px;
      max-width: 590px;

      .eicon-selector-ui {
        .carousel.results {
          max-height: unset;
          height: 535px;
          margin-bottom: 0.75rem;

          .carousel-inner {
            overflow-x: hidden;
            overflow-y: scroll;
            height: 100%;
          }

          .carousel-item {
            display: inline-block;
          }
        }
      }
    }
  }
</style>
