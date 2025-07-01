<template>
    <div class="form-group">
        <label v-if="label && id" :for="id">{{ label }}</label>
        <slot :cls="{'is-invalid': hasErrors, 'is-valid': valid}" :invalid="hasErrors" :valid="valid"></slot>
        <small v-if="helptext" class="form-text" :id="helpId">{{ helptext }}</small>
        <div v-if="hasErrors" class="invalid-feedback">
            <ul v-if="errorList.length > 1">
                <li v-for="error in errorList">{{ error }}</li>
            </ul>
            <template v-if="errorList.length === 1"> {{ errorList[0] }}</template>
        </div>
        <slot v-if="valid" name="valid"></slot>
    </div>
</template>

<script lang="ts">
    import { Vue, Component, Prop } from 'vue-facing-decorator';

    @Component
    export default class FormGroup extends Vue {
        @Prop({required: true})
        readonly field!: string;
        @Prop({required: true})
        readonly errors!: {[key: string]: ReadonlyArray<string> | undefined};
        @Prop({ default: null })
        readonly label!: string | null;
        @Prop({ default: null })
        readonly id!: string | null;
        @Prop({default: false})
        readonly valid!: boolean;
        @Prop({ default: null })
        readonly helptext!: string | null;

        get hasErrors(): boolean {
            return typeof this.errors[this.field] !== 'undefined';
        }

        get errorList(): ReadonlyArray<string> {
            return this.errors[this.field] || []; //tslint:disable-line:strict-boolean-expressions
        }

        get helpId(): string | undefined {
            return this.id !== undefined ? `${this.id}Help` : undefined;
        }

    }
</script>
