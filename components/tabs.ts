import { h, defineComponent, VNode, ref } from 'vue';

const Tabs = defineComponent({
    props: {
        value: {
            type: String,
            required: true,
        },
        tabs: {
            type: Object as () => { [key: string]: string },
            required: true,
        },
    },
    setup(props, ctx) {
        const _v = ref<string | undefined>(props.value);
        const selected = ref<string | undefined>(props.value);

        let children: { [key: string]: string | VNode | undefined } = {};
        if (ctx.slots.default) {
            ctx.slots.default().forEach((child, i) => {
                const key = typeof child.key === 'string' || typeof child.key === 'number'
                    ? child.key
                    : i;

                children[key] = child;
            })
        }
        else {
            children = props.tabs;
        }


        const keys = Object.keys(children);

        if (_v.value !== props.value) {
            selected.value = _v.value = props.value;
        }

        if (_v.value === undefined || children[_v.value] === undefined) {
            ctx.emit('input', _v.value = keys[0]);
        }

        if (selected.value !== _v.value && children[selected.value!] !== undefined) {
            ctx.emit('input', _v.value = selected.value);
        }

        return h(
            'div',
            { class: 'nav-tabs-scroll' },
            [ h(
                'ul',
                { class: 'nav nav-tabs' },
                keys.map(key => h(
                    'li',
                    { class: 'nav-item' },
                    [ h(
                        'a', {
                            href: '#',
                            class: [
                                'nav-link',
                                { active: _v.value === key }
                            ],
                            onClick: () => ctx.emit('input', key),
                        },
                        [ children[key]! ]
                    )]
                ))
            )]
        );
    },
})

export default Tabs;
