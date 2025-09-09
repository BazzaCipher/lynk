<script lang="ts">
	import { useSvelteFlow } from '@xyflow/svelte';

	const { screenToFlowPosition } = useSvelteFlow();

    let isDragging = $state(false);

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if(!event.dataTransfer) return;
		console.log("waht")

		const mousePos = screenToFlowPosition()

		// Have to mention only allowed file types
		let droppedFiles = Array.from(event.dataTransfer.files);
		Promise.allSettled(droppedFiles.map((file) => layoutStateManager.dropFile(file,)))
			.then((results) => {
				results.filter(({status}) => status == "rejected")
					.forEach(console.log)
				for (const result of results) {
					if (result.status == "rejected") {
						console.log(result.reason)
					} else {
						console.log("Successfully file dropped")
					}
				}
			})
			.catch(console.log)
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		isDragging = false;
	}
</script>

<div
	class="text-center text-gray-600 z-[0]
	{isDragging ? 'pointer-events-auto' : 'pointer-events-none'}"
	class:border-2={isDragging}
	class:border-dashed={isDragging}
	class:border-gray-800={isDragging}
	role="region"
	aria-label="File upload drop zone"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	style="position:absolute; inset:0;"
	>
	<slot />
</div>

