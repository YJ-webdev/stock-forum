"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { LOGIN_LABELS } from "@/lib/data/translations";
import OAuthSignIn from "./oauth-sign-in";

interface LoginDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const LoginDialog = ({ isOpen, setIsOpen }: LoginDialogProps) => {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = LOGIN_LABELS[language];

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "BullBearVote";

  const welcome = labels.welcome.replaceAll("{siteName}", siteName);
  const notice = labels.notice.replaceAll("{siteName}", siteName);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="
          left-0 top-0 m-0
          flex h-dvh w-full max-w-none
          translate-x-0 translate-y-0 flex-col
          gap-0 overflow-y-auto rounded-none border-none
          bg-background p-0 shadow-none
          pt-[env(safe-area-inset-top)]
          pb-[env(safe-area-inset-bottom)]

          [&>button]:right-4
          [&>button]:top-[max(1rem,env(safe-area-inset-top))]
          [&>button]:z-50

          sm:left-1/2 sm:top-1/2
          sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-md
          sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:rounded-2xl sm:py-0
        "
      >
        <Card
          className="
    my-auto w-full shrink-0
    rounded-none border-none bg-transparent
    py-12 shadow-none
    sm:rounded-2xl sm:py-8
    border-0 ring-0 outline-none
focus:ring-0 focus:outline-none
focus-visible:ring-0 focus-visible:outline-none
  "
        >
          <CardHeader>
            <DialogTitle dir="auto" className="text-center text-lg font-medium">
              {welcome}
            </DialogTitle>

            <CardDescription dir="auto" className="text-center tracking-tight">
              {labels.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            {process.env.NODE_ENV === "development" ? (
              <OAuthSignIn provider="github" />
            ) : (
              <>
                <OAuthSignIn provider="google" />
                <OAuthSignIn provider="facebook" />
                <OAuthSignIn provider="twitter" />
              </>
            )}
          </CardContent>

          <CardFooter className="text-center text-xs text-muted-foreground">
            <p dir="auto">{notice}</p>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
