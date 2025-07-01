<template>
    <dropdown class="filterable-select" linkClass="custom-select" :keepOpen="true">
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
    import { Vue, Component, Prop, Watch, Hook } from 'vue-facing-decorator';
    import Dropdown from '../components/Dropdown.vue';

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
        watchValue(newValue: object | object[] | undefined): void {
            this.selected = newValue ?? null;
        }

        @Hook('created')
        created(): void {
            this.selected = this.value ? this.value : (this.multiple ? [] : null);
        }

        select(item: object): void {
            if(this.multiple) {
                const selected = <object[]>this.selected;
                const index = selected.indexOf(item);
                if(index === -1) selected.push(item);
                else selected.splice(index, 1);
            } else
                this.selected = item;
            this.$emit('input', this.selected);
        }

        isSelected(option: object): boolean {
            return (<object[]>this.selected).includes(option);
        }

        get filtered(): object[] {
            // tslint:disable-next-line:no-unsafe-any
            return this.options.filter((x) => this.filterFunc(this.filterRegex, x));
        }

        get label(): string | undefined {
            return this.multiple ? `${this.title} - ${(<object[]>this.selected).length}` :
                (this.selected ? this.selected.toString() : this.title);
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
