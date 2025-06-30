import { h, VNode } from 'vue';
import { BBCodeElement } from './core';
import { BBCodeParser } from './parser';

export const BBCodeView = (parser: BBCodeParser) => ({
    render( props: { text?: string, unsafeText: string, afterInsert?: (element: HTMLElement) => void },
            _ctx: any): VNode {
        return h('span', {
            key: props.text,
            onVnodeMounted(node: VNode) {
                if (node.el) {
                    node.el.appendChild(
                        parser.parseEverything(props.text ?? props.unsafeText)
                    )

                    if (props.afterInsert) props.afterInsert(node.el);
                }
            },
            onVnodeUnmounted(node: VNode) {
                const elem = node.el!.firstChild as BBCodeElement;
                if (elem.cleanup) elem.cleanup()
            },
        });
    },
});
