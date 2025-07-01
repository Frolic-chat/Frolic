import {CreateElement, FunctionalComponentOptions, RenderContext, VNode} from 'vue';
import {DefaultProps, RecordPropsDefinition} from 'vue/types/options'; //tslint:disable-line:no-submodule-imports
import {BBCodeElement} from './core';
import {BBCodeParser} from './parser';
import { h, ref, PropType, nextTick, onUnmounted, FunctionalComponent, ComponentOptionsWithoutProps } from 'vue';

// BBCodeParser returns type HTMLElement, not a VNode

export const BBCodeView = (parser: BBCodeParser): FunctionalComponentOptions<DefaultProps, RecordPropsDefinition<DefaultProps>> => ({
    functional: true,
    render(createElement: CreateElement, context: RenderContext): VNode {
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
        const vnode = createElement('span', context.data);
        vnode.key = context.props.text;
        return vnode;
        //tslint:enable
    }
});

// import { h, ref, PropType, nextTick, onUnmounted, SetupContext } from 'vue';
// import { BBCodeParser } from './parser';

// export const BBCodeView = (parser: BBCodeParser) => {
//     return {
//         props: {
//             text: { type: String as PropType<string>, default: '' },
//             unsafeText: { type: String as PropType<string>, default: '' },
//             afterInsert: { type: Function as PropType<(element: HTMLElement) => void>, default: () => {} }
//         },
//         setup(props: {text?: string, unsafeText: string, afterInsert: (element: HTMLElement) => void}, _ctx: SetupContext) {
//             const parsedContent = parser.parseEverything(props.text || props.unsafeText);
//             const spanRef = ref<HTMLElement | null>(null);

//             nextTick(() => {
//                 if (spanRef.value) {
//                     spanRef.value.innerHTML = parsedContent.outerHTML;
//                     props.afterInsert(spanRef.value);
//                 }
//             });

//             onUnmounted(() => {
//                 const element = spanRef.value?.firstChild as HTMLElement & { cleanup?: () => void };
//                 if (element.cleanup) element.cleanup();
//             });

//             return () => h('span', { ref: spanRef }, []);
//         }
//     };
// };
