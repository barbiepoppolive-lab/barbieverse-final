import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <div className="hidden md:block"><SiteFooter /></div>

      <a
        href="https://wa.me/919555644465"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-110 md:bottom-6 md:right-6 md:h-14 md:w-14"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-6 w-6 text-white md:h-7 md:w-7" />
      </a>
    </div>
  );
}
