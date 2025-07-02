<template>
    <dropdown class="filterable-select" linkClass="custom-select" :keepOpen="multiple">
        <!-- It works like this:
                - Multi-select: Fill in the title slot of `dropdown` with `get label()`.
                - Single-select: Offer a slot to the parent to fill in (default: `get label()`).
         -->
        <template v-if="multiple" v-slot:title>{{label}}</template>
        <template v-else v-slot:title><slot name="title">{{label}}</slot></template>

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
    import { Vue, Component, Prop, Watch, Emit } from 'vue-facing-decorator';
    import Dropdown from '../components/Dropdown.vue';
    import Logger from 'electron-log/renderer';
    const log = Logger.scope('FilterableSelect');


    @Component({
        components: {dropdown: Dropdown}
    })
    export default class FilterableSelect extends Vue {
        @Prop({ default: '' })
        readonly placeholder!: string;
        @Prop({required: true})
        readonly options!: object[];
        @Prop({default: () => ((filter: RegExp, value: string) => filter.test(value))})
        readonly filterFunc!: (filter: RegExp, value: object) => boolean;
        @Prop({ default: false })
        readonly multiple!: boolean;
        @Prop({ default: null })
        readonly value!: object | object[] | null;
        @Prop({ default: '' })
        readonly title!: string;
        filter = '';
        // noinspection TypeScriptValidateTypes
        selected: object | object[] | null = null;

        @Watch('value')
        watchValue(newValue: object | object[] | null, _oldValue: object | object[] | null): void {
            this.selected = newValue;
        }

        //@Hook('created')
        created(): void {
            this.selected = this.value ?? this.multiple ? [] : null;
        }

        @Emit('input')
        select(item: object): object | object[] | null {
            if(this.multiple) {
                const selected = <object[]>this.selected;
                const index = selected.indexOf(item);
                if (index === -1) selected.push(item);
                else selected.splice(index, 1);
            }
            else {
                this.selected = item;
            }

            log.debug('select.result', { selected: this.selected, type: typeof this.selected });
            return this.selected;
        }

        isSelected(option: object): boolean {
            return (<object[]>this.selected).includes(option);
        }

        get filtered(): object[] {
            // tslint:disable-next-line:no-unsafe-any
            return this.options.filter((x) => this.filterFunc(this.filterRegex, x));
        }

        get label(): string | undefined {
            return this.multiple
                ? `${this.title} - ${(<object[]>this.selected).length}`
                :this.selected ? this.selected.toString() ?? this.title : this.title;
        }

        get filterRegex(): RegExp {
            return new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');
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
