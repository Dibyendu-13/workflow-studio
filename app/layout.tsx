import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./studio.css";

export const metadata: Metadata = {
  title: "Workflow Studio",
  description: "Run seven workflow prototypes and explore their build plans.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
