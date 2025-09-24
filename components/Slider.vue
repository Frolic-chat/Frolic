<!--
Copyright (c) 2013 Bootsnipp.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->
<template>
<div>
    <label class="switch">
        <input type="checkbox" :class="color" v-model="ticked">
        <span class="slider" :class="{ round: round }"></span>
    </label>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@f-list/vue-ts';

@Component({})
export default class Slider extends Vue {
    /**
     * v-model tie-in's for the parent.
     */
    @Prop({ default: false }) readonly value!: boolean;
    get ticked()  { return this.value }
    set ticked(v) { this.$emit('input', v) }

    /**
     * Coloration, using bootstrap's color variables.
     */
    @Prop({ default: 'default' })
    readonly color!: 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger';

    /**
     * Squared or rounded? Default: squared
     */
    @Prop({ default: true })
    readonly round!: boolean;
}
</script>

<style lang="scss">
/* The switch - the box around the slider */
.switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
    margin: auto;
    vertical-align: middle;
}

/* Hide default HTML checkbox */
.switch input {
    display:none;
}

/* The slider */
.slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--light);
    -webkit-transition: .4s;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: var(--white);
    -webkit-transition: .4s;
    transition: .4s;
}

input.default:checked + .slider {
    background-color: var(--dark);
}
input.primary:checked + .slider {
    background-color: var(--primary);
}
input.success:checked + .slider {
    background-color: var(--success);
}
input.info:checked + .slider {
    background-color: var(--info);
}
input.warning:checked + .slider {
    background-color: var(--warning);
}
input.danger:checked + .slider {
    background-color: var(--danger);
}

input:focus + .slider {
    box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
    border-radius: 34px;
}

.slider.round:before {
    border-radius: 50%;
}
</style>
