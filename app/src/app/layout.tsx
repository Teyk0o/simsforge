import type { Metadata } from 'next';
import { Inter, Nunito } from 'next/font/google';
import { RootLayoutClient } from '@/components/providers/RootLayoutClient';
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
            <RootLayoutClient>
                {children}
            </RootLayoutClient>
        </body>
        </html>
    );
}