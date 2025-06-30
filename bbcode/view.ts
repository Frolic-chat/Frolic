import { h, VNode } from 'vue';
import { BBCodeElement } from './core';
import { BBCodeParser } from './parser';

export const BBCodeView = (parser: BBCodeParser) => ({
    render(props: any, { slots }: any): VNode {
        return h('span', {
            key: props.text,
            onVnodeMounted(node: VNode) {
                if (node.el) {
                    node.el.appendChild(parser.parseEverything(
                        props.text ?? props.unsafeText
                    ))

                    if (props.afterInsert) props.afterInsert(node.el);
                }
            },
            onVnodeUnmounted(node: VNode) {
                const elem = node.el!.firstChild as BBCodeElement;
                if (elem.cleanup) elem.cleanup()
            },
        });
        context.data.hook = {
            insert(node: VNode): void {
                if (node.el) {
                    node.el.appendChild(
                            parser.parseEverything(
                                    context.props.text !== undefined
                                        ? context.props.text
                                        : context.props.unsafeText
                            )
                    );

                    if (context.props.afterInsert !== undefined)
                        context.props.afterInsert(node.el);
                }
            },
            destroy(node: VNode): void {
                const element = (<BBCodeElement>(<Element>node.el).firstChild);
                if(element.cleanup !== undefined) element.cleanup();
            }
        };
        const vnode = h('span', context.data);
        vnode.key = context.props.text;
        return vnode;
        //tslint:enable
    }
});
