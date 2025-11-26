import Vue, { CreateElement, VNode } from 'vue';

interface ClassProps {
    navClasses:  string;
    listClasses: string;
    itemClasses: string;
    linkClasses: string;
}

const Tabs = Vue.extend({
    props: {
        'value': [ String, Number ],
        'tabs': { required: false },
        // Optional bootstrap customization
        navClasses:  { type: String, default: 'nav-tabs-scroll' }, // div
        listClasses: { type: String, default: 'nav nav-tabs'    }, // ul
        itemClasses: { type: String, default: 'nav-item'        }, // li
        linkClasses: { type: String, default: 'nav-link'        }, // a
    },
    render( this: Vue & {
                readonly value?: string,
                _v?: string,
                selected?: string,
                tabs: { readonly [key: string]: string; };
            } & ClassProps,
            createElement: CreateElement
        ): VNode {
            let children: { [key: string]: string | VNode | undefined; };

            if (this.$slots['default'] !== undefined) {
                children = {};

                this.$slots['default'].forEach((child, i) => {
                    if (child.context !== undefined)
                        children[child.key !== undefined ? child.key : i] = child;
                });
            }
            else {
                children = this.tabs;
            }

            const keys = Object.keys(children);

            if (this._v !== this.value)
                this.selected = this._v = this.value;

            if (this._v === undefined || children[this._v] === undefined)
                this.$emit('input', this._v = keys[0]);

            if (this.selected !== this._v && children[this.selected!] !== undefined)
                this.$emit('input', this._v = this.selected);

            return createElement(
                'div',
                { staticClass: this.navClasses },
                [ createElement(
                    'ul',
                    { staticClass: this.listClasses },
                    keys.map(key => createElement(
                        'li',
                        { staticClass: this.itemClasses },
                        [ createElement(
                            'a',
                            {
                                attrs:       { href: '#' },
                                staticClass: this.linkClasses,
                                class:       { active: this._v === key },
                                on:          { click: () => this.$emit('input', key) }
                            },
                            [ children[key] ]
                        )]
                    ))
                )]
            );
    }
});

export default Tabs;
