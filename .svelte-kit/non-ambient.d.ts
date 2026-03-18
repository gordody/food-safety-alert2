
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/recalls" | "/recalls/[recallNumber]";
		RouteParams(): {
			"/recalls/[recallNumber]": { recallNumber: string }
		};
		LayoutParams(): {
			"/": { recallNumber?: string };
			"/recalls": { recallNumber?: string };
			"/recalls/[recallNumber]": { recallNumber: string }
		};
		Pathname(): "/" | `/recalls/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.DS_Store" | "/icons/.DS_Store" | "/icons/all.svg" | "/icons/custom.svg" | "/icons/local.svg" | "/icons/search.svg" | "/images/product-placeholder.svg" | "/svelte.svg" | "/tauri.svg" | "/vite.svg" | string & {};
	}
}