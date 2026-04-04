import "@/app/globals.css";
import { QuizAppProvider } from "@/components/quiz-app-provider";

export const metadata = {
  title: "RCCG Region 46 Quiz",
  description: "A clean, modern and responsive RCCG quiz web app for Vercel deployment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <QuizAppProvider>{children}</QuizAppProvider>
      </body>
    </html>
  );
}
