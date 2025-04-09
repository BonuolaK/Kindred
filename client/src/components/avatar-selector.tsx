import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AVATAR_EMOJIS } from "./avatar-placeholder";
import { useState } from "react";

type AvatarSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
  currentAvatar?: string | null;
};

export default function AvatarSelector({
  open,
  onOpenChange,
  onSelect,
  currentAvatar,
}: AvatarSelectorProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(currentAvatar || "");
  
  const handleSelect = () => {
    onSelect(selectedEmoji);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-4 mt-4 max-h-[300px] overflow-y-auto p-1">
          {AVATAR_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant={selectedEmoji === emoji ? "default" : "outline"}
              className={`h-12 w-12 p-0 text-2xl ${selectedEmoji === emoji ? "ring-2 ring-offset-2 ring-primary" : ""}`}
              onClick={() => setSelectedEmoji(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-center">
            {selectedEmoji && (
              <div className="text-4xl mb-2">{selectedEmoji}</div>
            )}
          </div>
          <Button onClick={handleSelect} disabled={!selectedEmoji}>
            Select Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}