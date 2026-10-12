"use client";

import { useFormStatus } from "react-dom";
import { BsGithub } from "react-icons/bs";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

import { handleSignIn } from "@/app/actions/auth";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import { OAUTH_LABELS } from "@/lib/data/translations";

const OAUTH_PROVIDERS = {
  google: {
    name: "Google",
    Icon: FcGoogle,
    iconSize: 26,
  },
  github: {
    name: "GitHub",
    Icon: BsGithub,
    iconSize: 24,
  },
  facebook: {
    name: "Facebook",
    Icon: FaFacebook,
    iconSize: 24,
  },
} as const;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

interface OAuthSignInProps {
  provider: OAuthProvider;
}

export default function OAuthSignIn({ provider }: OAuthSignInProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);

  const label = OAUTH_LABELS[language].replace(
    "{provider}",
    OAUTH_PROVIDERS[provider].name,
  );

  async function signIn() {
    await handleSignIn(provider);
  }

  return (
    <form action={signIn}>
      <OAuthButton provider={provider} label={label} />
    </form>
  );
}

function OAuthButton({
  provider,
  label,
}: OAuthSignInProps & { label: string }) {
  const { pending } = useFormStatus();
  const { Icon, iconSize } = OAUTH_PROVIDERS[provider];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="
        grid min-h-11 w-full
        grid-cols-[1.75rem_1fr_1.75rem]
        items-center gap-2 rounded-lg
        border border-primary/20 px-4 py-2
        text-sm font-medium
        cursor-pointer transition-colors
        hover:bg-primary/5
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-ring
        focus-visible:ring-offset-2
        disabled:cursor-wait disabled:opacity-50
      "
    >
      <span className="flex items-center justify-center">
        <Icon
          size={iconSize}
          className={provider === "facebook" ? "text-[#1877F2]" : undefined}
          aria-hidden="true"
        />
      </span>

      <span dir="auto" className="text-center">
        {label}
      </span>

      <span aria-hidden="true" />
    </button>
  );
}
