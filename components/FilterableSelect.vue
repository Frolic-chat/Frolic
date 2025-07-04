<template>
    <dropdown class="filterable-select" linkClass="custom-select" :keepOpen="multiple ? true : false">
        <template slot="title" v-if="multiple">{{label}}</template>
        <slot v-else slot="title" :option="selected">{{label}}</slot>

        <div style="padding:10px;">
            <input v-model="filter" class="form-control" :placeholder="placeholder" @mousedown.stop/>
        </div>
        <div class="dropdown-items">
            <template v-if="multiple">
                <a href="#" @click.stop="select(option)" v-for="option in filtered" class="dropdown-item">
                    <input type="checkbox" :checked="isSelected(option)"/>
                    <slot :option="option">{{option}}</slot>
                </a>
            </template>
            <template v-else>
                <a href="#" @click="select(option)" v-for="option in filtered" class="dropdown-item">
                    <slot :option="option">{{option}}</slot>
                </a>
            </template>
        </div>
    </dropdown>
</template>

<script lang="ts">
    type Multiselect<M extends boolean> = M extends true ? object[] : object;

    import { Component, Prop, Watch, Hook } from '@f-list/vue-ts';
    import Vue from 'vue';
    import Dropdown from '../components/Dropdown.vue';

    @Component({
        components: {dropdown: Dropdown}
    })
    export default class FilterableSelect extends Vue {
        @Prop
        readonly placeholder?: string;
        @Prop({required: true})
        readonly options!: object[];
        @Prop({ default:
            // The bad typing here is definitely jank.
            () => ((filter: RegExp, value: string) => filter.test(value))
        })
        readonly filterFunc!: (filter: RegExp, value: object) => boolean;
        @Prop({ default: false })
        readonly multiple: boolean = false;
        @Prop
        // @ts-ignore
        readonly value?: Multiselect<typeof this.multiple>;
        @Prop
        readonly title?: string;

        filter = '';
        // @ts-ignore
        selected?: Multiselect<typeof this.multiple>;

        @Watch('value')
        watchValue(newValue: object | object[] | undefined): void {
            this.selected = newValue;
        }

        /**
         * `select` pushes the value up to the parent vue and is the primary way the parent should be aware of changes to this object.
         *
         * It eliminates the need for the parent to have their own detector.
         */
        select(item: object): void {
            if (this.multiple) {
                const selected = <object[]>this.selected;
                const index = selected.indexOf(item);
                if (index === -1) selected.push(item);
                else selected.splice(index, 1);
            } else {
                this.selected = item;
            }
            this.$emit('input', this.selected);
        }

        // This is only called from a place where `this.selected` is guaranteed
        // to be an object[], but casting leaves a bad feeling.
        isSelected(option: object): boolean {
            if (Array.isArray(this.selected))
                return this.selected.includes(option);
            else
                return this.selected === option;
        }

        get filtered(): object[] {
            return this.options.filter(x => this.filterFunc(this.filterRegex, x));
        }

        get label(): string | undefined {
            return this.multiple
                ? `${this.title} - ${(<object[]>this.selected).length}`
                : (this.selected ? this.selected.toString() : this.title);
        }

        get filterRegex(): RegExp {
            return new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');
        }

        @Hook('created')
        created(): void {
            this.selected = this.value ?? (this.multiple ? [] : undefined);
        }
    }
</script>

<style lang="scss">
    .filterable-select {
        .dropdown-items {
            max-height: 200px;
            overflow-y: auto;
        }

        button {
            display: flex;
            text-align: left
        }

        input[type=checkbox] {
            vertical-align: text-bottom;
            margin-right: 5px;
        }
    }
</style>
