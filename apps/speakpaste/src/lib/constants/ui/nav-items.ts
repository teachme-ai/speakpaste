import HomeIcon from '@lucide/svelte/icons/house';
import SettingsIcon from '@lucide/svelte/icons/settings';
import type { Component } from 'svelte';

export type NavItem = {
	label: string;
	href: string;
	icon: Component;
	isActive: (pathname: string) => boolean;
};

const matchesRoute = (href: string) => (pathname: string) =>
	pathname === href || pathname.startsWith(`${href}/`);

export const NAV_ITEMS: NavItem[] = [
	{
		label: 'Home',
		href: '/',
		icon: HomeIcon,
		isActive: (pathname) => pathname === '/',
	},
	{
		label: 'Settings',
		href: '/settings',
		icon: SettingsIcon,
		isActive: matchesRoute('/settings'),
	},
];
