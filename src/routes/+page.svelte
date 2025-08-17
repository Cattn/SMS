<script lang="ts">
	import { Button } from 'm3-svelte';
	import { goto } from '$app/navigation';
	import { configState } from '$lib/config.svelte';
	import { hdrifyBackground } from '@cattn/hdr';
</script>

<div class="mb-8 flex min-h-screen flex-col items-center justify-center p-4 pl-28 md:p-0">
	<div class="mb-4 text-center">
		<h1 class="sms-title text-primary decoration-tertiary underline">SMS</h1>
		<p class="text-on-surface-variant mt-2 max-w-md text-lg">
			Simple file sharing made easy. Upload, share, and manage your files with automatic expiration
			and clean links.
		</p>
	</div>

	<div class="mb-5 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm transition-shadow hover:shadow-md">
			<div class="mb-4 flex items-center">
				<div class="bg-secondary mr-4 flex h-12 w-12 items-center justify-center rounded-2xl">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						class="text-on-secondary"
					>
						<path
							fill="currentColor"
							d="M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20zm5-12.15L9.125 9.725q-.3.3-.712.288T7.7 9.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 4.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 7.85V15q0 .425-.288.713T12 16t-.712-.288T11 15z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-on-surface text-xl font-semibold">Upload Files</h3>
					<p class="text-on-surface-variant text-sm">Share files with custom expiration</p>
				</div>
			</div>
			<p class="text-on-surface-variant mb-4">
				Upload any file and get a shareable link. Set custom expiration times or let files live
				forever.
			</p>
			<Button variant="filled" onclick={() => goto('/upload')}>Start Upload</Button>
		</div>

		<div class="bg-surface-container rounded-3xl p-6 shadow-sm transition-shadow hover:shadow-md">
			<div class="mb-4 flex items-center">
				<div class="bg-secondary mr-4 flex h-12 w-12 items-center justify-center rounded-2xl">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						class="text-on-secondary"
					>
						<path
							fill="currentColor"
							d="M9 14h10l-3.45-4.5l-2.3 3l-1.55-2zm-1 4q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm0-2h12V4H8zm-4 6q-.825 0-1.412-.587T2 20V6h2v14h14v2zM8 4h12v12H8z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-on-surface text-xl font-semibold">File Library</h3>
					<p class="text-on-surface-variant text-sm">Manage your uploaded files</p>
				</div>
			</div>
			<p class="text-on-surface-variant mb-4">
				View, download, and manage all your uploaded files. Preview images and videos directly in
				your browser.
			</p>
			<Button variant="filled" onclick={() => goto('/library')}>Browse Files</Button>
		</div>
	</div>

	<div class="mb-8 w-full max-w-4xl">
		<div class="bg-surface-container rounded-3xl p-6 shadow-sm">
			<h2 class="text-on-surface text-center text-2xl font-semibold">Features</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div class="p-4 text-center">
					<div
						class="bg-tertiary-container mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="28"
							height="28"
							viewBox="0 0 24 24"
							class="text-on-tertiary-container"
						>
							<path
								fill="currentColor"
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"
							/>
						</svg>
					</div>
					<h4 class="text-on-surface mb-2 font-semibold">Auto Expiration</h4>
					<p class="text-on-surface-variant text-sm">
						Set custom expiration times for automatic file cleanup
					</p>
				</div>

				<div class="p-4 text-center">
					<div
						class="bg-tertiary-container mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="28"
							height="28"
							viewBox="0 0 24 24"
							class="text-on-tertiary-container"
						>
							<path
								fill="currentColor"
								d="M17 7h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c1.65 0 3 1.35 3 3s-1.35 3-3 3h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c2.76 0 5-2.24 5-5s-2.24-5-5-5m-9 5c0 .55.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1H9c-.55 0-1 .45-1 1m2 3H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h3c.55 0 1-.45 1-1s-.45-1-1-1H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h3c.55 0 1-.45 1-1s-.45-1-1-1"
							/>
						</svg>
					</div>
					<h4 class="text-on-surface mb-2 font-semibold">Clean URLs</h4>
					<p class="text-on-surface-variant text-sm">
						Generate clean, shareable links for easy file access
					</p>
				</div>

				<div class="p-4 text-center">
					<div
						class="bg-tertiary-container mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="28"
							height="28"
							viewBox="0 0 24 24"
							class="text-on-tertiary-container"
						>
							<path
								fill="currentColor"
								d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22L12 18.77L5.82 22L7 14.14L2 9.27l6.91-1.01z"
							/>
						</svg>
					</div>
					<h4 class="text-on-surface mb-2 font-semibold">Media Preview</h4>
					<p class="text-on-surface-variant text-sm">
						Preview images and videos directly in your browser
					</p>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-primary-container w-full max-w-md rounded-2xl p-6 text-center" {@attach hdrifyBackground()}>
		<h3 class="text-on-primary-container mb-2 text-lg font-semibold">Ready to share?</h3>
		<p class="text-on-primary-container mb-4 text-sm">
			Upload your first file and get a shareable link in seconds
		</p>
		<Button variant="filled" onclick={() => goto('/upload')}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				class="mr-2"
			>
				<path
					fill="currentColor"
					d="M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20zm5-12.15L9.125 9.725q-.3.3-.712.288T7.7 9.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 4.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 7.85V15q0 .425-.288.713T12 16t-.712-.288T11 15z"
				/>
			</svg>
			Upload Now
		</Button>
	</div>
</div>

<style>
	.sms-title {
		font-size: 72px;
		font-family: 'Roboto Flex', sans-serif;
		font-optical-sizing: 144;
		font-weight: 800;
		font-style: normal;
		font-variation-settings:
			'slnt' 0,
			'wdth' 151,
			'GRAD' 150,
			'XOPQ' 27,
			'XTRA' 603,
			'YOPQ' 25,
			'YTAS' 757,
			'YTDE' -203,
			'YTFI' 738,
			'YTLC' 760,
			'YTUC' 712;
	}

	@media (max-width: 768px) {
		.sms-title {
			font-size: 56px;
		}
	}

	@media (max-width: 480px) {
		.sms-title {
			font-size: 48px;
		}
	}
</style>
