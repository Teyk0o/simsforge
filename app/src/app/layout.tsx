import type { Metadata } from 'next';
import { Inter, Nunito } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ToastContainer from '@/components/ui/ToastContainer';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

const nunito = Nunito({
    subsets: ['latin'],
    variable: '--font-nunito',
    weight: ['700', '800'],
});

export const metadata: Metadata = {
    title: 'SimsForge - Mod Manager',
    description: 'Gestion de mods The Sims 4 facilitée',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning data-theme="dark">
        <head />
        <body className={`${inter.variable} ${nunito.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider>
            <SessionProvider>
                <ToastProvider>
                    {children}
                    <ToastContainer />
                </ToastProvider>
            </SessionProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}