//import {Component} from 'vue';
import { Component } from '@f-list/vue-ts';
import {SharedStore, StoreMethods} from './interfaces';

export let Store: SharedStore = {
    shared: undefined!,
    authenticated: false
};

export const registeredComponents: {[key: string]: ReturnType<ReturnType<typeof Component>> | undefined} = {};

export function registerComponent(name: string, component: ReturnType<ReturnType<typeof Component>>): void {
    registeredComponents[name] = component;
}

export function registerMethod<K extends keyof StoreMethods>(name: K, func: StoreMethods[K]): void {
    methods[name] = func;
}

export const methods: StoreMethods = <StoreMethods>{}; //tslint:disable-line:no-object-literal-type-assertion
