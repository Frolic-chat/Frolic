<template>
    <div :class="wrapClass" @focusout="blur">
        <slot name="split"></slot>
        <a :class="linkClass" aria-haspopup="true" :aria-expanded="isOpen" @click.prevent="isOpen = !isOpen" href="#"
            :style="linkStyle" role="button" tabindex="-1" ref="button">
            <i :class="iconClass" v-if="!!iconClass"></i>
            <slot name="title">{{title}}</slot>
        </a>
        <div class="dropdown-menu" ref="menu" @mousedown.prevent.stop @click.prevent.stop="menuClick()">
            <slot></slot>
        </div>
    </div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Watch, Ref } from 'vue-facing-decorator';

    @Component
    export default class Dropdown extends Vue {
        isOpen = false;
        @Prop({default: 'btn btn-secondary dropdown-toggle'})
        readonly linkClass!: string;
        @Prop({default: 'dropdown'})
        readonly wrapClass!: string;
        @Prop({ default: null })
        readonly iconClass!: string | null;
        @Prop({ default: false })
        readonly keepOpen!: boolean;
        @Prop({ default: null })
        readonly title!: string | null;
        @Prop({default: 'width:100%;text-align:left;align-items:center'})
        readonly linkStyle!: string;

        @Ref
        menu!: HTMLDivElement;

        @Watch('isOpen')
        onToggle(): void {
            const menu = this.menu;
            if(!this.isOpen) {
                menu.style.cssText = '';
                return;
            }
            menu.style.display = 'block';
            const offset = menu.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.left = offset.right < window.innerWidth ? `${offset.left}px` : `${window.innerWidth - offset.width}px`;
            menu.style.top = (offset.bottom < window.innerHeight) ? `${offset.top}px` :
                `${offset.top - offset.height - (<HTMLElement>this.$el).offsetHeight}px`;
        }

        blur(event: FocusEvent): void {
            let elm = <HTMLElement | null>event.relatedTarget;
            while(elm) {
                if(elm === this.menu) return;
                elm = elm.parentElement;
            }
            this.isOpen = false;
        }

        menuClick(): void {
            if(!this.keepOpen) this.isOpen = false;
        }
    }
</script>
