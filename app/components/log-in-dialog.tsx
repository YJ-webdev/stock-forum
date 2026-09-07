import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import GoogleSignIn from "./google-sign-in";
import GithubSignIn from "./github-sign-in";

interface LoginDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const LoginDialog = ({ isOpen, setIsOpen }: LoginDialogProps) => {
  const siteName = process.env.SITE_NAME || "Stock Forum";
  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="p-0 shadow-none border-none
          /* Mobile First: Full Screen */
          w-screen h-screen max-w-full m-0 rounded-none flex flex-col justify-center
          /* Tablet & Desktop (sm breakpoint and above): Centered Card */
          sm:h-auto sm:max-w-md sm:rounded-full
        "
        >
          <Card
            className="
          /* Mobile First: Full Screen */
          w-screen h-screen max-w-full m-0 rounded-none flex flex-col justify-center
          /* Tablet & Desktop (sm breakpoint and above): Centered Card */
          sm:h-auto sm:max-w-md sm:rounded-2xl
        "
          >
            <CardHeader>
              <DialogTitle>
                <CardTitle className="font-medium text-lg text-center">
                  {siteName}에 오신 것을 환영합니다.
                </CardTitle>
              </DialogTitle>
              <CardDescription className="text-center tracking-tight ">
                구글 또는 깃허브로 로그인하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <GoogleSignIn />
              <div className="items-center justify-cente relative mt-3 -mb-2">
                <hr />
                <p className="z-10 mx-auto w-10 -translate-y-3 bg-white dark:bg-transparent text-center text-sm dark:text-gray-400">
                  or
                </p>
              </div>
              <GithubSignIn />
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground text-center">
              로그인 시, {siteName}에서 사용자가 공유하는 정보에 지속적으로
              액세스할 수 있으며, OAuth 제공자는 {siteName}이 해당 정보에
              액세스한 시점을 기록하게 됩니다.
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
};
