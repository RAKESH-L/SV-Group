import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { T } from "@/components/language-provider";
import { PushSubscriptionClient } from "@/components/push-subscription-client";
export const metadata: Metadata = {
  title: "Notifications | SV Groups",
  description: "Opt in to notifications for Sri Vinayaka Groups catalogue news and festive announcements.",
};
export default function NotificationPreferencesPage() {
  return <main className="page-shell sv-push-page">
    <Link className="back-link" href="/"><ArrowLeft size={15}/> <T text="Back to website"/></Link>
    <div className="eyebrow"><T text="YOUR CHOICE"/></div>
    <h1 className="page-title"><T text="Stay" /> <em><T text="informed."/></em></h1>
    <p className="page-lede"><T text="Receive occasional announcements when you choose. No account required, and you can unsubscribe anytime."/></p>
    <PushSubscriptionClient/>
  </main>;
}
