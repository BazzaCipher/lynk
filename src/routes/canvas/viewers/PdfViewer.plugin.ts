import type { ViewerPlugin, FileData } from '$lib/types';

function supports(file: FileData): boolean {
	return file.ext == "pdf"
}

const PdfViewer = {
	supports,
	load: () => import('./PdfViewer.svelte')
} satisfies ViewerPlugin;


export default PdfViewer;

