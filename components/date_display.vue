<template>
    <span class="localizable-date" :title="secondary ?? undefined">{{primary}}</span>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Watch } from 'vue-facing-decorator';
    import {formatDistanceToNow, format} from 'date-fns';
    import {settings} from '../site/utils';

    @Component
    export default class DateDisplay extends Vue {
        @Prop({required: true})
        readonly time!: string | null | number;
        primary: string | null = null;
        secondary: string | null = null;

        //@Hook('mounted')
        @Watch('time')
        mounted(): void {
            if(this.time === null || this.time === 0)
                return;
            const date = isNaN(+this.time) ? new Date(`${this.time}+00:00`) : new Date(+this.time * 1000);
            const absolute = format(date, 'yyyy-MM-dd HH:mm');
            const relative = formatDistanceToNow(date, {addSuffix: true});
            if(settings.fuzzyDates) {
                this.primary = relative;
                this.secondary = absolute;
            } else {
                this.primary = absolute;
                this.secondary = relative;
            }
        }
    }
</script>
