import { Kbd, KbdGroup } from "@/components/ui/kbd";

export function KbdMarkup() {
  return (
    <div className="flex flex-col items-center">
      {/* <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>⌥</Kbd>
        <Kbd>⌃</Kbd>
      </KbdGroup> */}
      <KbdGroup>
        <Kbd className="border font-light">Ctrl</Kbd>
        <span className="font-serif text-gray-500">+</span>
        <Kbd className="border font-light">K</Kbd>
      </KbdGroup>
    </div>
  );
}
