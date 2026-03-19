
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
	export interface AppTypes {
		RouteId(): "/" | "/canvas" | "/canvas/layoutmanager" | "/canvas/upload" | "/canvas/viewers";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/canvas": Record<string, never>;
			"/canvas/layoutmanager": Record<string, never>;
			"/canvas/upload": Record<string, never>;
			"/canvas/viewers": Record<string, never>
		};
		Pathname(): "/" | "/canvas" | "/canvas/" | "/canvas/layoutmanager" | "/canvas/layoutmanager/" | "/canvas/upload" | "/canvas/upload/" | "/canvas/viewers" | "/canvas/viewers/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/fileicon/INFO.md" | "/fileicon/avi.svg" | "/fileicon/csv.svg" | "/fileicon/default.svg" | "/fileicon/doc.svg" | "/fileicon/gif.svg" | "/fileicon/jpeg.svg" | "/fileicon/jpg.svg" | "/fileicon/json.svg" | "/fileicon/mp3.svg" | "/fileicon/mp4.svg" | "/fileicon/pdf.svg" | "/fileicon/png.svg" | "/fileicon/rtf.svg" | "/fileicon/tiff.svg" | "/fileicon/txt.svg" | "/fileicon/wav.svg" | "/fileicon/xls.svg" | "/fileicon/xlsx.svg" | string & {};
	}
}