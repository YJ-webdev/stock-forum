import { Extension, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";

import { SlashMenu, type SlashMenuRef } from "../slash-menu";
import { slashMenuItems, type SlashMenuItem } from "../slash-menu-items";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        allowSpaces: false,

        items: ({ query }: { query: string }) => {
          const normalizedQuery = query.trim().toLowerCase();

          return slashMenuItems
            .filter((item) =>
              item.title.toLowerCase().includes(normalizedQuery),
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

          // -------------------------------------------------------------------
          // POSITION
          // -------------------------------------------------------------------

          const updatePosition = (props: {
            clientRect?: (() => DOMRect | null) | null;
          }) => {
            if (!popup || !props.clientRect) return;

            const rect = props.clientRect();

            if (!rect) return;

            const GAP = 6;
            const VIEWPORT_PADDING = 12;

            // Reset previous constraints before measuring.
            popup.style.maxHeight = "";
            popup.style.overflowY = "";

            const popupRect = popup.getBoundingClientRect();

            const popupWidth = popupRect.width;
            const popupHeight = popupRect.height;

            // ---------------------------------------------------------------
            // AVAILABLE SPACE
            // ---------------------------------------------------------------

            const spaceBelow =
              window.innerHeight - rect.bottom - GAP - VIEWPORT_PADDING;

            const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;

            // ---------------------------------------------------------------
            // X POSITION
            // ---------------------------------------------------------------

            let x = rect.left;

            // Too far right → move left.
            if (x + popupWidth > window.innerWidth - VIEWPORT_PADDING) {
              x = window.innerWidth - popupWidth - VIEWPORT_PADDING;
            }

            // Too far left.
            x = Math.max(VIEWPORT_PADDING, x);

            // ---------------------------------------------------------------
            // Y POSITION
            // ---------------------------------------------------------------

            let y: number;

            // 1. Full menu fits below.
            if (spaceBelow >= popupHeight) {
              y = rect.bottom + GAP;
            }

            // 2. Full menu doesn't fit below,
            //    but does fit above.
            else if (spaceAbove >= popupHeight) {
              y = rect.top - popupHeight - GAP;
            }

            // 3. Neither side fits.
            //    Use whichever side has more room.
            else if (spaceBelow >= spaceAbove) {
              y = rect.bottom + GAP;

              popup.style.maxHeight = `${Math.max(120, spaceBelow)}px`;

              popup.style.overflowY = "auto";
            } else {
              const availableHeight = Math.max(120, spaceAbove);

              popup.style.maxHeight = `${availableHeight}px`;
              popup.style.overflowY = "auto";

              y = rect.top - Math.min(popupHeight, availableHeight) - GAP;
            }

            // Final viewport safety.
            y = Math.max(VIEWPORT_PADDING, y);

            Object.assign(popup.style, {
              left: `${x}px`,
              top: `${y}px`,
            });
          };

          return {
            // -----------------------------------------------------------------
            // START
            // -----------------------------------------------------------------

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
              popup.style.zIndex = "9999";

              popup.appendChild(component.element);

              document.body.appendChild(popup);

              // Wait one frame so ReactRenderer has its actual
              // width/height before we measure it.
              requestAnimationFrame(() => {
                updatePosition(props);
              });
            },

            // -----------------------------------------------------------------
            // UPDATE
            // -----------------------------------------------------------------

            onUpdate: (props) => {
              component.updateProps({
                items: props.items,
                command: props.command,
              });

              // Items can change the popup height:
              //
              // "/"     → many items
              // "/gif"  → one item
              //
              // Measure again after React updates.
              requestAnimationFrame(() => {
                updatePosition(props);
              });
            },

            // -----------------------------------------------------------------
            // KEYBOARD
            // -----------------------------------------------------------------

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.remove();
                popup = null;

                component.destroy();

                return true;
              }

              return component.ref?.onKeyDown(props.event) ?? false;
            },

            // -----------------------------------------------------------------
            // EXIT
            // -----------------------------------------------------------------

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
