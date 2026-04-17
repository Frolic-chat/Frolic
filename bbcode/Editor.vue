<template>
<div class="bbcode-editor" style="display:flex;flex-wrap:wrap;justify-content:flex-end">
  <slot name="default"></slot>
  <a v-if="hasToolbar" tabindex="0" class="btn btn-light bbcode-btn btn-sm" role="button" style="border-bottom-left-radius:0;border-bottom-right-radius:0" @click="showToolbar = true" @blur="showToolbar = false">
    <i class="fa fa-code"></i>
  </a>
  <div v-if="hasToolbar" class="bbcode-toolbar btn-toolbar" role="toolbar" :disabled="disabled" :style="showToolbar ? {display: 'flex'} : undefined" style="flex:1 51%; position: relative" @mousedown.stop.prevent>
    <div v-show="colorPopupVisible" v-on-clickaway="dismissColorSelector" class="popover popover-top color-selector">
      <div class="popover-body">
        <div class="btn-group" role="group" aria-label="Color">
          <button v-for="btnCol in buttonColors" :key="btnCol" type="button" class="btn text-color" :class="btnCol" :title="btnCol" tabindex="0" @click.prevent.stop="colorApply(btnCol)"></button>
        </div>
      </div>
    </div>
    <div v-show="colorPopupVisible" v-if="colorPopupVisible" class="modal-backdrop show color-popup-visible"></div>

    <div class="btn-group toolbar-buttons">
      <slot name="toolbar-start"></slot>
      <div v-if="!!characterName" class="btn btn-light btn-sm character-btn">
        <icon :character="characterName"></icon>
      </div>

      <!-- :key - trouble finding something unique, most attributes should be unique enough. -->
      <div v-for="button in buttons" :key="button.title" class="btn btn-light btn-sm" :class="button.outerClass" :title="button.title" @click.prevent.stop="apply(button)">
        <i :class="(button.class ? button.class : 'fa fa-fw ') + button.icon"></i>
      </div>
      <div class="btn btn-light btn-sm" :class="preview ? 'active' : ''" :title="preview ? 'Close Preview' : 'Preview'" @click="previewBBCode">
        <i class="fa fa-fw fa-eye"></i>
      </div>
      <slot name="toolbar-end"></slot>
    </div>
    <button type="button" class="close" aria-label="Close" style="margin-left:10px" @click="showToolbar = false">
      &times;
    </button>
  </div>
  <div class="bbcode-editor-text-area" style="order:100;width:100%;">
    <textarea v-show="!preview" ref="input" v-model="text"
        :maxlength="maxlength" :placeholder="placeholder"
        :disabled="disabled"
        class="bbcode-input"
        :class="finalClasses"
        @paste="onPaste"
        @input="onInput"
        @keypress="$emit('keypress', $event)"
        @keydown="onKeyDown" @keyup="onKeyUp"
    ></textarea>
    <div v-show="preview" class="bbcode-preview">
      <div class="bbcode-preview-warnings">
        <div v-show="previewWarnings.length" class="alert alert-danger">
          <li v-for="warning in previewWarnings" :key="warning">
            {{ warning }}
          </li>
        </div>
      </div>
      <div ref="preview-element" class="bbcode"></div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { Component, Hook, Prop, Watch } from '@frolic/vue-ts';
import Vue from 'vue';
import { mixin as clickaway } from 'vue-clickaway';
import { getKey } from '../chat/common';
import { Keys } from '../keys';
import { CoreBBCodeParser, urlRegex } from './core';
import { defaultButtons } from './editor';
import IconView from './IconView.vue';

import type { BBCodeElement } from './core';
import type { EditorButton, EditorSelection } from './editor';
import type { BBCodeParser } from './parser';
import type EIconSelector from './EIconSelector.vue';

@Component({
    components: {
        'icon': IconView,
    },
    mixins: [ clickaway ],
})
export default class Editor extends Vue {
    /**
       * Is it okay not to have an eicon selector on this component? Probably.
       */
    @Prop
    readonly eiconSelector?: EIconSelector;
    @Prop
    readonly extras?: EditorButton[];

    @Prop({ default: 1000 })
    readonly maxlength!: number;

    @Prop
    readonly classes?: string;

    @Prop
    readonly value?: string | undefined = undefined;

    @Prop
    readonly disabled?: boolean;

    @Prop
    readonly placeholder?: string;

    @Prop({ default: true })
    readonly hasToolbar!: boolean;

    @Prop({ default: false, type: Boolean })
    readonly invalid!: boolean;

    @Prop({ default: null })
    readonly characterName: string | null = null;

    @Prop({ default: 'normal' })
    readonly type: 'normal' | 'big' = 'normal';

    buttonColors = [
        'red',
        'orange',
        'yellow',
        'green',
        'cyan',
        'purple',
        'blue',
        'pink',
        'black',
        'brown',
        'white',
        'gray',
    ];
    colorPopupVisible = false;

    preview = false;
    previewWarnings: ReadonlyArray<string> = [];
    previewResult = '';
    text = this.value ?? '';
    element!:        HTMLTextAreaElement;
    // sizer!:          HTMLTextAreaElement;
    maxHeight!:      number;
    minHeight!:      number;
    showToolbar = false;

    protected parser!: BBCodeParser;
    protected defaultButtons = defaultButtons;

    private isShiftPressed = false;
    private undoStack: string[] = [];
    private undoIndex = 0;
    private lastInput = 0;

    @Hook('created')
    created(): void {
        // console.log('EDITOR', 'created');
        this.parser = new CoreBBCodeParser();
    }

    @Hook('mounted')
    mounted(): void {
        // console.log('EDITOR', 'mounted');
        this.element = this.$refs['input'] as HTMLTextAreaElement;

        const styles = window.getComputedStyle(this.element);

        this.maxHeight = parseInt(styles.maxHeight, 10) || 250;
        this.minHeight = parseInt(styles.minHeight, 10) || 60;

        window.setInterval(() => {
            if (Date.now() - this.lastInput >= 500 && this.text !== this.undoStack[0] && this.undoIndex === 0) {
                if (this.undoStack.length >= 30)
                    this.undoStack.pop();
                this.undoStack.unshift(this.text);
            }
        }, 500);
    }

    get finalClasses(): string | undefined {
        let classes = this.classes ?? '';
        if (this.invalid)
            classes += ' is-invalid';
        return classes;
    }

    get buttons(): EditorButton[] {
        const buttons = this.defaultButtons.slice();

        if (this.extras) {
            for (let i = 0, l = this.extras.length; i < l; i++) {
                const e = this.extras[i];
                if (e)
                    buttons.push(e);
            }
        }

        const color_btn = buttons.find(b => b.tag === 'color');

        if (color_btn) {
            color_btn.outerClass = this.colorPopupVisible
                ? 'toggled'
                : '';
        }

        return buttons;
    }

    getButtonByTag(tag: string): EditorButton {
        const btn = this.buttons.find(b => b.tag === tag);

        if (!btn)
            throw new Error('Unknown button');


        return btn;
    }

    @Watch('value')
    watchValue(newValue: string): void {
        // this.$nextTick(() => this.resize());
        if (this.text === newValue)
            return;
        this.text = newValue;
        this.lastInput = 0;
        this.undoIndex = 0;
        this.undoStack = [];
    }

    getSelection(): EditorSelection {
        return {
            start:  this.element.selectionStart,
            end:    this.element.selectionEnd,
            length: this.element.selectionEnd - this.element.selectionStart,
            text:   this.element.value.substring(this.element.selectionStart, this.element.selectionEnd),
        };
    }

    replaceSelection(replacement: string): string {
        const selection = this.getSelection();
        const start = this.element.value.substring(0, selection.start) + replacement;
        const end = this.element.value.substring(selection.end);
        this.element.value = start + end;
        this.element.dispatchEvent(new Event('input'));
        return start + end;
    }

    setSelection(start: number, end?: number): void {
        if (end === undefined)
            end = start;
        this.element.focus();
        this.element.setSelectionRange(start, end);
    }

    applyText(startText: string, endText: string, withInject?: string): void {
        const selection = this.getSelection();
        if (selection.length > 0) {
            const replacement = startText + (withInject || selection.text) + endText;
            this.text = this.replaceSelection(replacement);
            this.setSelection(selection.start, selection.start + replacement.length);
        }
        else {
            const start = this.text.substring(0, selection.start) + startText;
            const end = endText + this.text.substring(selection.start);
            this.text = start + (withInject || '') + end;

            const point = withInject ? start.length + withInject.length + endText.length : start.length;

            this.$nextTick(() => this.setSelection(point));
        }
        this.$emit('input', this.text);
    }

    dismissColorSelector(): void {
        this.colorPopupVisible = false;
    }

    colorApply(btnColor: string): void {
        const button = this.getButtonByTag('color');

        this.applyButtonEffect(button, btnColor);

        this.dismissColorSelector();
    }

    dismissEIconSelector(): void {
        this.eiconSelector?.hide();
    }

    showEIconSelector(): void {
        this.eiconSelector?.engage(this.onSelectEIcon);

        this.$nextTick(() => this.eiconSelector?.setFocus());
    }

    onSelectEIcon = (eiconId: string, shift: boolean) => {
        this.eiconApply(eiconId, shift);
    };

    eiconApply(eiconId: string, shift: boolean): void {
        const button = this.getButtonByTag('eicon');

        this.applyButtonEffect(button, undefined, eiconId);

        if (!shift)
            this.dismissEIconSelector();

    }

    apply(button: EditorButton): void {
        if (button.tag === 'color') {
            this.colorPopupVisible = !this.colorPopupVisible;
            return;
        }
        else if (button.tag === 'eicon') {
            this.showEIconSelector();
            this.colorPopupVisible = false;
            return;
        }
        else {
            this.colorPopupVisible = false;
        }

        this.applyButtonEffect(button);
    }

    applyButtonEffect(button: EditorButton, withArgument?: string, withInject?: string): void {
        // Allow emitted variations for custom buttons.
        this.$once('insert', (startText: string, endText: string) => this.applyText(startText, endText));

        if (button.handler)
            return button.handler.call(this, this);

        if (button.startText === undefined || withArgument)
            button.startText = `[${button.tag}${withArgument ? '=' + withArgument : ''}]`;
        if (button.endText === undefined)
            button.endText = `[/${button.tag}]`;

        const ebl = button.endText ? button.endText.length : 0;
        const sbl = button.startText ? button.startText.length : 0;

        if (this.text.length + sbl + ebl > this.maxlength)
            return;

        this.applyText(button.startText || '', button.endText || '', withInject);
        this.lastInput = Date.now();
    }

    onInput(): void {
        if (this.undoIndex > 0) {
            this.undoStack = this.undoStack.slice(this.undoIndex);
            this.undoIndex = 0;
        }
        this.$emit('input', this.text);
        this.lastInput = Date.now();
    }

    onKeyDown(e: KeyboardEvent): void {
        const key = getKey(e);
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
            if (key === Keys.KeyZ) {
                e.preventDefault();

                if (this.undoIndex === 0 && this.undoStack[0] !== this.text)
                    this.undoStack.unshift(this.text);

                const last_index = this.undoStack.length - 1;
                if (this.undoIndex < last_index) {
                    const next = this.undoStack[this.undoIndex + 1];

                    this.text = next;
                    this.undoIndex++;
                    this.$emit('input', this.text);
                    this.lastInput = Date.now();
                }
            }
            else if (key === Keys.KeyY) {
                e.preventDefault();
                const prev = this.undoIndex - 1 >= 0
                    ? this.undoStack[this.undoIndex - 1]
                    : undefined;
                if (prev !== undefined) {
                    this.text = prev;
                    this.undoIndex--;
                    this.$emit('input', this.text);
                    this.lastInput = Date.now();
                }
            }
            for (const button of this.buttons) {
                if (button.key === key) {
                    e.stopPropagation();
                    e.preventDefault();
                    this.applyButtonEffect(button);
                    break;
                }
            }
        }
        else if (e.shiftKey) {
            this.isShiftPressed = true;
        }
        this.$emit('keydown', e);
    }

    onKeyUp(e: KeyboardEvent): void {
        if (!e.shiftKey)
            this.isShiftPressed = false;
        this.$emit('keyup', e);
    }

    onPaste(e: ClipboardEvent): void {
        const data = e.clipboardData?.getData('text/plain');
        if (data) {
            if (!this.isShiftPressed && urlRegex.test(data)) {
                e.preventDefault();
                this.applyText(`[url=${data}]`, '[/url]');
            }
        }
    }

    focus(): void {
        this.element.focus();
    }

    isFocused(): boolean {
        return this.element === document.activeElement;
    }

    previewBBCode(): void {
        this.doPreview();
    }

    protected doPreview(): void {
        const target = this.$refs['preview-element'] as HTMLElement;
        if (this.preview) {
            this.preview = false;
            this.previewWarnings = [];
            this.previewResult = '';
            const preview = target.firstChild as BBCodeElement;
            // noinspection TypeScriptValidateTypes
            if (preview.cleanup !== undefined)
                preview.cleanup();
            if (target.firstChild !== null)
                target.removeChild(target.firstChild);
        }
        else {
            this.preview = true;
            this.parser.storeWarnings = true;
            target.appendChild(this.parser.parseEverything(this.text));
            this.previewWarnings = this.parser.warnings;
            this.parser.storeWarnings = false;
        }
    }
}
</script>
<style lang="scss">
.bbcode-editor-text-area > textarea {
    width: 100%;

    line-height: 1.5;
    min-height: 3.8em !important; // Heuristics - how can I just declare content height?
    max-height: 1.5em * 10;

    field-sizing: content;
    resize: none;

    border-top-left-radius:  0;
    border-top-right-radius: 0;
}

.bbcode-toolbar .character-btn a {
    width: 100%;
    height: 100%;
    display: inline-block;

    img {
        /* Sized like a fa icon */
        width: 1.25em;
        height: 1.25em;
        vertical-align: sub;
    }
}

  .bbcode-toolbar {
      .modal-backdrop.color-popup-visible {
          opacity: 0;
      }

    .toolbar-buttons {
      flex-wrap: wrap;
      width: 100%;

      .btn.toggled {
        background-color: var(--secondary) !important;
      }
      .btn {
        flex-grow: 0.1;
        flex-shrink: 0;
        max-width: 50px;
      }
    }

    .color-selector {
      width: 13.6em;
      top: -57px;
      left: 94px;
      /* z-index 1041 is just above the modal-backdrop default,
         allowing it to eat mouse clicks outside the color-selector. */
      z-index: 1041;
      background-color: var(--input-bg);

      > .popover-body {
        padding: 0.75em;
      }

      .btn-group {
        display: flex;
        flex-flow: wrap;
        justify-content: center;

        margin: auto !important;
      }

      .btn {
        &.text-color {
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          margin-right: -1px !important;
          margin-bottom: -1px !important;
          border: 1px solid var(--secondary);
          width: 1.3rem;
          height: 1.3rem;
          min-width: 16.6%;

          &::before {
            display: none !important;
          }

          &:hover {
            border-color: var(--gray-dark) !important;
          }

          &.red {
            background-color: var(--textRedColor);
          }

          &.orange {
            background-color: var(--textOrangeColor);
          }

          &.yellow {
            background-color: var(--textYellowColor);
          }

          &.green {
            background-color: var(--textGreenColor);
          }

          &.cyan {
            background-color: var(--textCyanColor);
          }

          &.purple {
            background-color: var(--textPurpleColor);
          }

          &.blue {
            background-color: var(--textBlueColor);
          }

          &.pink {
            background-color: var(--textPinkColor);
          }

          &.black {
            background-color: var(--textBlackColor);
          }

          &.brown {
            background-color: var(--textBrownColor);
          }

          &.white {
            background-color: var(--textWhiteColor);
          }

          &.gray {
            background-color: var(--textGrayColor);
          }
        }
      }
    }
  }
</style>
