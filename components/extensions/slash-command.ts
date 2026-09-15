import { Extension, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { computePosition, flip, shift } from "@floating-ui/dom";

import { SlashMenu, type SlashMenuRef } from "../slash-menu";

import { slashMenuItems, type SlashMenuItem } from "../slash-menu-items";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,

        items: ({ query }: { query: string }) => {
          return slashMenuItems
            .filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 10);
        },

        command: ({
          editor,
          range,
          props,
        }: {
          editor: Parameters<SlashMenuItem["command"]>[0]["editor"];
          range: Parameters<SlashMenuItem["command"]>[0]["range"];
          props: SlashMenuItem;
        }) => {
          props.command({
            editor,
            range,
          });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,

        ...this.options.suggestion,

        render: () => {
          let component: ReactRenderer<
            SlashMenuRef,
            {
              items: SlashMenuItem[];
              command: (item: SlashMenuItem) => void;
            }
          >;

          let popup: HTMLDivElement | null = null;

          const updatePosition = async (props: {
            clientRect?: (() => DOMRect | null) | null;
          }) => {
            if (!popup || !props.clientRect) return;

            const rect = props.clientRect();

            if (!rect) return;

            const virtualElement = {
              getBoundingClientRect: () => rect,
            };

            const { x, y } = await computePosition(virtualElement, popup, {
              placement: "bottom-start",
              middleware: [
                flip(),
                shift({
                  padding: 8,
                }),
              ],
            });

            Object.assign(popup.style, {
              left: `${x}px`,
              top: `${y}px`,
            });
          };

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, {
                props: {
                  items: props.items,
                  command: props.command,
                },

                editor: props.editor,
              });

              popup = document.createElement("div");

              popup.style.position = "fixed";
              popup.style.zIndex = "50";

              popup.appendChild(component.element);

              document.body.appendChild(popup);

              updatePosition(props);
            },

            onUpdate: (props) => {
              component.updateProps({
                items: props.items,
                command: props.command,
              });

              updatePosition(props);
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.remove();
                popup = null;

                component.destroy();

                return true;
              }

              return component.ref?.onKeyDown(props.event) ?? false;
            },

            onExit: () => {
              popup?.remove();
              popup = null;

              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
