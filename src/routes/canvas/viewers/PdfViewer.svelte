<script lang="ts">
	import { onMount } from 'svelte';
	import { on } from 'svelte/events';
	import {
		PdfLoader,
		PdfHighlighter,
		HighlightsModel,
		type PdfHighlightUtils as TPdfHighlightUtils
	} from 'svelte-pdf-highlighter';
	import Toolbar from './Toolbar.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import type { ContextMenuProps } from './ContextMenu.svelte';
	import type { ViewerProps } from '$lib/types';
	import { toObjectUrl } from '$lib/urls';

	let { file, isVisible, onClose }: ViewerProps = $props();
	let fileUrl = $state.raw("");
	let loadFail = $state(true);

    const colours = ['#fcf151', '#ff659f', '#83f18d', '#67dfff', '#b581fe'];
	const scrolledTo_color = 'red';
	let sidebarVisible = $state(true);
	let pdfHighlighterUtils: Partial<TPdfHighlighterUtils> | null = $state(null);
	let contextMenu: ContextMenuProps | null = $state(null);

    let workerUrl: string | null = $state(null);
	(async () => {
		workerUrl = (await import("pdfjs-dist/build/pdf.worker?url")).default;
	})();

	let highlightsStore: HighlightsModel<Highlight>|null = $state.raw(null);
	let unsubscribe: () => boolean;

	let setHighlightsModel = (highlights_array?: Array<Highlight>) => {
		highlightsStore = new HighlightsModel(highlights_array ?? []);
		/** subscribe to highlights model updates  */
		unsubscribe = highlightsStore.subscribe((highlights)=>{
			console.log($state.snapshot(highlights));
			if (true) return new Error('Failed to save highlights');
		});
	}

    /** Scroll to highlight based on hash in the URL */
    const parseIdFromHash = () => {
      return document.location.hash.slice('#highlight-'.length);
    };
    const resetHash = () => {
        document.location.hash = '';
    };
    const scrollToHighlightFromHash = () => {
        let id = parseIdFromHash();
        if (id.length < 1) return;
        const highlight = highlightsStore.getHighlightById(id);
        if (highlight && pdfHighlighterUtils.scrollToHighlight) {
            pdfHighlighterUtils.scrollToHighlight(highlight);
        }
    };

	onMount(loadFileInViewer);
	onMount(setHighlightTools);

	async function loadFileInViewer() {
		try {
			fileUrl = await toObjectUrl(file);
			if (fileUrl) { loadFail = false; }
			console.log(fileUrl);
		} catch (e) {
			console.log('Failed to convert file to objectUrl')
		}
	}
	async function setHighlightTools() {
        pdfHighlighterUtils = {
            textSelectionDelay: 1500,
            selectedColorIndex: 0,
            colours: colours,
            scrolledTo_color: scrolledTo_color,
            currentScaleValue: 1,
        }
        setHighlightsModel();
        const removeClickHandler = on(
            document,
            'click',
            handleClick,
        );
        // const removeHashChangeHandler = on(
        //     window,
        //     'hashchange',
        //     scrollToHighlightFromHash,
        // );
        return () => {
            removeClickHandler();
            //removeHashChangeHandler();
        };
	}

	// Event handlers
	function handleClick () {
        if (contextMenu) {
            contextMenu = null;
        }
    };
	const handleContextMenu = (
        event: MouseEvent,
        type: 'highlight' | 'document',
        data: ViewportHighlight<CommentedHighlight> | null,
    ) => {
        event.stopPropagation();
        event.preventDefault();
        if (type === 'highlight' && data) {
            contextMenu = {
                xPos: event.clientX,
                yPos: event.clientY,
                target: {
                    type: 'highlight',
                    deleteHighlight: () => highlightsStore.deleteHighlight(data),
                    moveDown: () => highlightsStore.moveDown(data),
                    moveUp: () => highlightsStore.moveUp(data),
                    //editComment: () => editComment(data),
                },
            };
        } else if (type === 'document') {
            contextMenu = {
                xPos: event.clientX,
                yPos: event.clientY,
                target: {
                    type: 'document',
                    enableTextSelection: () => {
                        pdfHighlighterUtils.selectedTool = 'text_selection';
                    },
                    enableDragScroll: () => {
                        pdfHighlighterUtils.selectedTool = 'hand';
                    },
                    enableHighlightPen: () => {
                        pdfHighlighterUtils.selectedTool = 'highlight_pen';
                    },
                    enableAreaSelection: () => {
                        pdfHighlighterUtils.selectedTool = 'area_selection';
                    },
                    //pdfHighlighterUtils.selectedTool,
                },
            };
        }
    };
</script>

{#if (loadFail || !isVisible)}
	<p class="italic text-chart-1">File loading failed</p>
{:else}
{#if (highlightsStore !== null)}
	<Toolbar  
		bind:pdfHighlighterUtils = {pdfHighlighterUtils}
		bind:sidebarVisible
	/>
{/if}
<!--
{#if (sidebarVisible && highlightsStore !== null)}
	<Sidebar
		highlights={highlightsStore.highlights}
		resetHighlights={highlightsStore.resetHighlights}
		{toggleDocument}
		editHighlight = {highlightsStore.editHighlight}
		deleteHighlight = {highlightsStore.deleteHighlight}
		sidebarScrollToId = {(callback: (id: string) => void) => sidebarScrollToId = callback}
		bind:pdfHighlighterUtils = {pdfHighlighterUtils}
	/> 
{/if}
-->
{#if (workerUrl !== null && highlightsStore !== null && pdfHighlighterUtils !== null)}
<PdfLoader document={fileUrl} worker={workerUrl} class="block size-full">
	{#snippet pdfHighlighterWrapper(pdfDocumentRef)}
	<PdfHighlighter
		{highlightsStore}
		pdfDocument={pdfDocumentRef}
		pdfViewerOptions = {{
			//annotationMode: 0,
		}}
		onContextMenu={(e)=>handleContextMenu(e,'document',null)}
		onHighlightContextMenu={(e, data)=>handleContextMenu(e,'highlight',data)}
		onHighlightClick = {(e, data) => {
				e.stopPropagation();
				sidebarScrollToId(data.id);
			}}
		bind:pdfHighlighterUtils = {pdfHighlighterUtils}
		<!-- onScrollAway={resetHash} -->
		<!-- onHighlightsRendered={scrollToHighlightFromHash} -->
		scaleOnResize={false}
	>
		<!-- Custom highlight container (optional) -->
		<!-- {#snippet highlightContainer()}
			<HighlightContainer
				{highlightMixBlendMode}
				editHighlight = {highlightsStore.editHighlight}
				onContextMenu={(e, data)=>handleContextMenu(e,'highlight',data)}
				onClick = {(e, data) => {
					e.stopPropagation();
					sidebarScrollToId(data.id);
					//setTip({highlight: data, show: true, position: data.position}, true, true);
				}}
				{pdfHighlighterUtils}
			/>
		{/snippet} -->

		<!-- Custom popup snippets (optional) -->
		<!--
		{#snippet highlightPopup(highlight, setPinned)}
			<div class="Highlight__popup">
				{#if highlight.comment }
					<div style="margin: 5px;" onclick={()=>setPinned(true)}> 
						{#if highlight.comment.length > 20 }
							<span style="mask-image: linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0));">
							{highlight.comment.slice(0, 21) + '...'}</span> (click to expand)
						{:else}
							{highlight.comment}
						{/if}        
						<span style="font-size: 0.8em;">(click to edit)</span>
					</div>
				{:else}
					<div style="margin: 5px;" onclick={()=>setPinned(true)}>Comment has no Text  <span style="font-size: 0.8em;">(click to edit)</span></div>
				{/if}
			</div>
		{/snippet}
		-->

		<!--
		{#snippet editHighlightPopup(highlight, colours, onEdit, onDelete)}
			<div class="Highlight__popup">
				<textarea 
					onchange={(e) => onEdit((e.target as HTMLInputElement).value)}
					value={highlight.comment ? highlight.comment : ''}
				></textarea>
				<hr>
				{#each colours as colour}
					<button 
						class="colour" 
						onclick={()=>setColor(colour)} 
						style="background-color: {colour}" 
						onpointerdown={(e) => {e.preventDefault(); e.stopPropagation();}}
						onpointerup={(e) => {e.preventDefault(); e.stopPropagation();}} >  
					</button>
					{/each}
				<button onclick={() => onDelete(highlight)}>delete</button>
			</div>
		{/snippet}
		-->

		<!--
		{#snippet newHighlightPopup(highlight, colours, onAddHighlight)}
			<div class="Highlight__popup">
				{#each colours as colour}
					<button 
						class="colour"  
						onclick={
							(e) => {
								if (!highlight.id) {
									highlight.colour = colour;
									onAddHighlight(highlight);
								}
							}
						}
						style="background-color: {colour}"
						onpointerdown={(e) => {e.preventDefault(); e.stopPropagation();}}
						onpointerup={(e) => {e.preventDefault(); e.stopPropagation();}}
					></button>
				{/each}

				<button 
					onclick={(e)=>{
						navigator.clipboard.writeText(tipContainerState.highlight.content.text);
						clearTextSelection();
						hideTip(e, true);
					}}
				>copy</button>
			</div>
		{/snippet}
		-->

	</PdfHighlighter>
	{/snippet}
</PdfLoader>
{/if}
{/if}

