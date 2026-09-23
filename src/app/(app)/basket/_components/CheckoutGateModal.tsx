"use client";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * The wall for guests: shown only when Checkout is clicked, never earlier.
 * Browsing, comparing and building a basket stay free of this. next=/basket
 * on both links, so a successful sign-in or sign-up returns here with the
 * basket already intact (it is the same browser storage, untouched by auth).
 */
export function CheckoutGateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Ready to complete your purchase?">
      <div className="flex flex-col gap-3">
        <p className="text-[13.5px] leading-relaxed text-fg-secondary">Your basket is saved. Sign in or create a Solink account to send this as a request — nothing in it is lost.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button href="/login?next=/basket" className="w-full"><LogIn className="size-4" aria-hidden /> Log in</Button>
          <Button href="/signup?next=/basket" variant="outline" className="w-full"><UserPlus className="size-4" aria-hidden /> Create account</Button>
        </div>
        <button type="button" onClick={onClose} className="press mx-auto text-[13px] font-medium text-fg-secondary underline underline-offset-2 hover:text-fg">
          Back to basket
        </button>
      </div>
    </Modal>
  );
}
