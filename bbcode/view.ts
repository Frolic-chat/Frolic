import {CreateElement, FunctionalComponentOptions, RenderContext, VNode} from 'vue';
import {DefaultProps, RecordPropsDefinition} from 'vue/types/options';
import {BBCodeElement} from './core';
import {BBCodeParser} from './parser';

export const BBCodeView = (parser: BBCodeParser): FunctionalComponentOptions<DefaultProps, RecordPropsDefinition<DefaultProps>> => ({
    functional: true,
    render(createElement: CreateElement, context: RenderContext): VNode {
        context.data.hook = {
            insert(node: VNode): void {
                node.elm!.appendChild(parser.parseEverything(
                    context.props.text !== undefined ? context.props.text : context.props.unsafeText));
                if(context.props.afterInsert !== undefined) context.props.afterInsert(node.elm);
            },
            destroy(node: VNode): void {
                const element = (<BBCodeElement | undefined>(<Element>node.elm).firstChild);
                if (element?.cleanup) element.cleanup();
            }
        };
        const vnode = createElement('span', context.data);
        vnode.key = context.props.text;
        return vnode;
    }
});
