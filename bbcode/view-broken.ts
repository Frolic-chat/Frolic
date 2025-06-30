import { h, ref, VNode, PropType, nextTick, onUnmounted, FunctionalComponent, ComponentOptionsWithoutProps } from 'vue';
import { BBCodeElement } from './core';
import { BBCodeParser } from './parser';

// BBCodeParser returns type HTMLElement, not a VNode

// export const BBCodeView: FunctionalComponent = (parser: BBCodeParser) => (props: { text?: string, unsafeText: string, afterInsert?: (elm: HTMLElement) => void }) => {
//     const span = h('span', {}, []);
//     const element = parser.parseEverything(props.text ?? props.unsafeText);
//     span.children = [element];

//     span.componentOptions?.hooks?.insert = (node: VNode) => {
//         const elm = node.elm as HTMLElement;
//         if (elm) {
//             elm.appendChild(element as Node);
//             if (props.afterInsert) props.afterInsert(elm);
//         }
//     };

//     span.componentOptions?.hooks?.destroy = (node: VNode) => {
//         const elm = node.elm as HTMLElement;
//         const bbCodeElement = elm.firstChild as BBCodeElement;
//         if (bbCodeElement && bbCodeElement.cleanup) bbCodeElement.cleanup();
//     };

//     return span;
// }

export const BBCodeView = (parser: BBCodeParser) => {
    return {
        props: {
            text:        { type: String as PropType<string>, default: '' },
            unsafeText:  { type: String as PropType<string>, default: '' },
            afterInsert: { type: Function as PropType<(elm: HTMLElement) => void>, default: (elm: HTMLElement) => {} }
        },
        setup(  props: { text?: string,
                         unsafeText: string,
                         afterInsert: (elm: HTMLElement) => void },
                _ctx: any) {
            const parsedContent = parser.parseEverything(props.text ?? props.unsafeText);
            const span = h('span', {}, props.text ?? props.unsafeText)

            return () => {
                const span = h('span', {}, props.text || props.unsafeText);
                nextTick(() => {
                    if (span.el) {
                        span.el.appendChild(parser.parseEverything(props.text || props.unsafeText));
                        props.afterInsert(span.el);
                    }
                });
                onUnmounted(() => {
                    const element = span.el?.firstChild as BBCodeElement;
                    if (element.cleanup) element.cleanup();
                });
                return span;
            };
        }
    };
};


export const BBCodeView = (parser: BBCodeParser) => ({
    functional: true,
    render(context: RenderContext): VNode {
        /*tslint:disable:no-unsafe-any*///because we're not actually supposed to do any of this
        context.data.hook = {
            insert(node: VNode): void {
                if (node.elm) {
                    node.elm!.appendChild(
                            parser.parseEverything(
                                    context.props.text !== undefined
                                        ? context.props.text
                                        : context.props.unsafeText
                            )
                    );

                    if (context.props.afterInsert !== undefined)
                        context.props.afterInsert(node.elm);
                }
            },
            destroy(node: VNode): void {
                const element = (<BBCodeElement>(<Element>node.elm).firstChild);
                if(element.cleanup !== undefined) element.cleanup();
            }
        };
        const vnode = h('span', context.data);
        vnode.key = context.props.text;
        return vnode;
        //tslint:enable
    }
});

import { h, ref, PropType, nextTick, onUnmounted, SetupContext } from 'vue';
import { BBCodeParser } from './parser';

export const BBCodeView = (parser: BBCodeParser) => {
    return {
        props: {
            text: { type: String as PropType<string>, default: '' },
            unsafeText: { type: String as PropType<string>, default: '' },
            afterInsert: { type: Function as PropType<(element: HTMLElement) => void>, default: () => {} }
        },
        setup(props: {text?: string, unsafeText: string, afterInsert: (element: HTMLElement) => void}, _ctx: SetupContext) {
            const parsedContent = parser.parseEverything(props.text || props.unsafeText);
            const spanRef = ref<HTMLElement | null>(null);

            nextTick(() => {
                if (spanRef.value) {
                    spanRef.value.innerHTML = parsedContent.outerHTML;
                    props.afterInsert(spanRef.value);
                }
            });

            onUnmounted(() => {
                const element = spanRef.value?.firstChild as HTMLElement & { cleanup?: () => void };
                if (element.cleanup) element.cleanup();
            });

            return () => h('span', { ref: spanRef }, []);
        }
    };
};
