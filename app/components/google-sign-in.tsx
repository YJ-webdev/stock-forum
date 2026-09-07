import { handleSignIn } from "@/app/actions/auth";
import { FcGoogle } from "react-icons/fc";

export default function GoogleSignIn() {
  return (
    <form action={async () => await handleSignIn("google")}>
      <div className="relative flex items-center justify-center hover:bg-primary/5 border border-primary/20 rounded-lg">
        <FcGoogle size={26} className="sm:absolute left-4" />
        <button type="submit" className="px-4 py-2 outline-none ">
          <strong>구글</strong> 계정으로 로그인 하기
        </button>
      </div>
    </form>
  );
}
